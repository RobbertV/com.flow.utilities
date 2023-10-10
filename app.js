'use strict';

const Homey = require('homey');
const { HomeyAPI } = require('homey-api');
const tinycolor = require('tinycolor2');
const flowActions = require('./lib/flows/actions');
const flowTriggers = require('./lib/flows/triggers');
const { calculateDuration, calculateComparison, formatToken, calculationType, convertNumber, convertText } = require('./lib/helpers');

const _settingsKey = `${Homey.manifest.id}.settings`;

class App extends Homey.App {
    log() {
        console.log.bind(this, '[log]').apply(this, arguments);
    }

    error() {
        console.error.bind(this, '[error]').apply(this, arguments);
    }

    // -------------------- INIT ----------------------

    async onInit() {
        this.log(`${this.homey.manifest.id} - ${this.homey.manifest.version} started...`);

        this.TOKENS = {};

        this.SRC_LIST = [
            { name: 'duration', type: 'string' },
            { name: 'durationInSeconds', type: 'number' },
            { name: 'currency', type: 'string' },
            { name: 'comparison', type: 'number' },
            { name: 'calculation', type: 'number' },
            { name: 'decimals', type: 'number' },
            { name: 'text', type: 'string' },
            { name: 'replacementString', type: 'string' }
        ];

        this._api = await HomeyAPI.createAppAPI({
            homey: this.homey,
            debug: false
        });

        await this.initSettings();

        this.log('[onInit] - Loaded settings', this.appSettings);

        await this.setTokens(this.appSettings.VARIABLES, this.appSettings.VARIABLES);
        await flowActions.init(this);
        await flowTriggers.init(this);
        await this.setCheckZoneOnOffInterval();
    }

    // -------------------- SETTINGS ----------------------

    async initSettings() {
        try {
            let settingsInitialized = false;
            this.homey.settings.getKeys().forEach((key) => {
                if (key == _settingsKey) {
                    settingsInitialized = true;
                }
            });

            if (settingsInitialized) {
                this.log('[initSettings] - Found settings key', _settingsKey);
                this.appSettings = this.homey.settings.get(_settingsKey);

                if (!('ZONES' in this.appSettings)) {
                    await this.updateSettings({
                        ...this.appSettings,
                        ZONES: {}
                    });
                }
            } else {
                this.log(`Initializing ${_settingsKey} with defaults`);
                await this.updateSettings({
                    VARIABLES: [],
                    COMPARISONS: [],
                    TOTALS: [],
                    ZONES: {}
                });
            }
        } catch (err) {
            this.error(err);
        }
    }

    async updateSettings(settings, update = false) {
        try {
            this.log('[updateSettings] - New settings:', settings);
            const oldSettings = this.appSettings;
            this.appSettings = settings;

            await this.homey.settings.set(_settingsKey, this.appSettings);

            if (update) {
                await this.setTokens(settings.VARIABLES, oldSettings.VARIABLES);
            }
        } catch (err) {
            this.error(err);
        }
    }

    async removeSettings(token) {
        const COMPARISONS = this.appSettings.COMPARISONS.filter((setting) => setting.token !== token);
        const TOTALS = this.appSettings.TOTALS.filter((setting) => setting.token !== token);

        this.log('[removeSettings] - Remove settings for', token);

        await this.updateSettings({
            ...this.appSettings,
            COMPARISONS,
            TOTALS
        });
    }

    async updateTotals(token, newValueObj) {
        const currentTokenTotals = this.appSettings.TOTALS.find((total) => total.token === token);
        const otherTotals = this.appSettings.TOTALS.filter((total) => total.token !== token);
        const newTokenTotals = { token, ...currentTokenTotals, ...newValueObj };

        await this.updateSettings({
            ...this.appSettings,
            TOTALS: [...otherTotals, newTokenTotals]
        });
    }

    async setTokens(newVariables, oldVariables = []) {
        await newVariables.forEach((t) => {
            const existingVariableData = this.appSettings.TOTALS.find((x) => x.token === t);

            this.createTokenVariants(t, existingVariableData);
        });

        if (oldVariables.length) {
            const difference = oldVariables.filter((x) => !newVariables.includes(x));
            difference.forEach(async (d) => {
                await this.removeTokenVariants(d);
                this.removeSettings(d);
            });
        }
    }

    async createToken(name, paramOptions) {
        const defaultOptions = {
            src: '',
            value: '',
            type: 'string'
        };
        const options = { ...defaultOptions, ...paramOptions };
        const { src, value, type } = options;
        const suffix = this.homey.__(`helpers.${src}`);
        let title = `${name} ${suffix}`;

        const id = formatToken(title);

        if (!this.TOKENS[id]) {
            this.TOKENS[id] = await this.homey.flow.createToken(id, {
                type,
                title
            });
            this.log(`[createToken] - created Token => ID: ${id} - Title: ${title} - Type: ${type}`);
        }

        this.log(`[createToken] - set token value => ID: ${id} - Value: ${value}`);

        try {
            await this.TOKENS[id].setValue(value);
        } catch (error) {
            this.log(`[Error setToken] ${error}`);
        }
    }

    async removeToken(name, src) {
        const suffix = this.homey.__(`helpers.${src}`);
        let title = `${name} ${suffix}`;
        const id = formatToken(title);

        if (this.TOKENS[id]) {
            await this.TOKENS[id].unregister();
            // Remove token from list, since unregister doesn't do this.
            delete this.TOKENS[id];

            this.log(`[removeToken] - removed Token => ID: ${id} - Title: ${title} - ${!!this.TOKENS[id]}`);
        }
    }

    async createTokenVariants(tokenID, existingVariableData) {
        this.SRC_LIST.forEach((src) => {
            const suffix = this.homey.__(`helpers.${src.name}`);
            const title = `${tokenID} ${suffix}`;
            const id = formatToken(title);
            const fallbackValue = src.type === 'string' ? '' : 0;

            if (!this.TOKENS[id]) {
                this.createToken(tokenID, { src: src.name, type: src.type, value: (existingVariableData && existingVariableData[src.name]) || fallbackValue });
            }
        });
    }

    async removeTokenVariants(tokenID) {
        this.SRC_LIST.forEach((src) => {
            this.removeToken(tokenID, src.name);
        });
    }

    // -------------------- FUNCTIONS ----------------------

    async setCheckZoneOnOffInterval(oldZones = [], newZones = Object.keys(this.appSettings.ZONES)) {
        const devices = Object.values(await this._api.devices.getDevices());
        const newC = newZones.filter((d) => !oldZones.includes(d));
        const that = this;
        for (const device of devices) {
            if (device.capabilitiesObj && device.capabilitiesObj.onoff && newC.includes(device.zone)) {
                device.makeCapabilityInstance('onoff', () => {
                    that.checkZoneOnOff(devices, device.zone);
                    that.checkDeviceOnOff(device, device.zone);
                });
            }
        }
    }

    async checkDeviceOnOff(device, zone) {
        const onoffDevice = device.zone == zone && device.capabilitiesObj.onoff && !device.settings.energy_alwayson && !device.settings.override_onoff;

        if (onoffDevice) {
            const value = device.capabilitiesObj.onoff.value;
            const key = value ? 'DEVICE_ZONE_ON' : 'DEVICE_ZONE_OFF';

            this.homey.app[`trigger_${key}`]
                .trigger({ name: device.name, zone: device.zoneName, ison: value }, { zone })
                .catch(this.error)
                .then(this.log(`[trigger_${key}] - Triggered - ${zone} - ${value}`));
        }
    }

    async checkZoneOnOff(devices, zone) {
        const onoffDevices = devices.filter((d) => d.zone == zone && d.capabilitiesObj.onoff && !d.settings.energy_alwayson && !d.settings.override_onoff);
        if (onoffDevices) {
            const isOn = onoffDevices.every((v) => v.settings && v.capabilitiesObj.onoff.value === true);
            const isOff = onoffDevices.every((v) => v.capabilitiesObj.onoff.value === false);

            let zoneChanges = this.appSettings.ZONES;
            let key = null;
            let value = null;

            if (isOn && !this.appSettings.ZONES[zone]) {
                value = true;
                key = 'ZONE_ON';
            } else if (isOff && !!this.appSettings.ZONES[zone]) {
                value = false;
                key = 'ZONE_OFF';
            }

            if (key) {
                await this.updateSettings({
                    ...this.appSettings,
                    ZONES: { ...zoneChanges, [zone]: value }
                });

                this.homey.app[`trigger_${key}`]
                    .trigger({}, { zone })
                    .catch(this.error)
                    .then(this.log(`[trigger_${key}] - Triggered - ${zone} - ${value}`));
            }
        }
    }

    async action_START(token, paramOptions) {
        const defaultOptions = {
            dateStart: null,
            comparison: null
        };
        const options = { ...defaultOptions, ...paramOptions };
        const { dateStart, comparison } = options;
        const date = dateStart ? new Date() : dateStart;
        const newSettings = this.appSettings.COMPARISONS.filter((setting) => setting.token !== token);
        const existing_comparison = this.appSettings.COMPARISONS.find((x) => x.token === token);

        await this.updateSettings({
            ...this.appSettings,
            COMPARISONS: [...newSettings, { ...existing_comparison, token, ...(date && { date }), ...(comparison && { comparison }) }]
        });
    }

    async action_END(token, src, value = null) {
        this.homey.app.log('[action_END] -', token);
        const existing_comparison = this.appSettings.COMPARISONS.find((x) => x.token === token);

        if (!existing_comparison) {
            throw new Error(`No comparison found for ${token}`);
        }
        this.homey.app.log('[action_END] - found existing comparison', existing_comparison, 'type', typeof existing_comparison.date);

        const date = existing_comparison.date ? new Date() : null;
        const existingDate = typeof existing_comparison.date === 'string' ? new Date(existing_comparison.date) : existing_comparison.date;
        const duration = date ? calculateDuration(existingDate, date, false, this.homey.__, this.homey.app.log) : null;
        const durationInSeconds = date ? calculateDuration(existingDate, date, true, this.homey.__, this.homey.app.log) : null;
        const comparison = value ? calculateComparison(existing_comparison.comparison, value) : null;

        const totals = this.appSettings.TOTALS.filter((total) => total.token !== token);

        if (src === 'duration' && duration) {
            await this.updateTotals(token, { duration, durationInSeconds });
            await this.createToken(token, { src, value: duration });
            await this.createToken(token, { src: 'durationInSeconds', value: durationInSeconds });
            this.homey.app.trigger_DURATION
                .trigger({ token, duration, durationInSeconds }, { token })
                .catch(this.error)
                .then(this.log(`[trigger_DURATION] - Triggered: "${token}: ${duration} ${durationInSeconds}"`));
        }

        if (src === 'comparison' && comparison !== null) {
            await this.updateTotals(token, { comparison });
            await this.createToken(token, { src, value: parseFloat(comparison), type: 'number' });

            this.homey.app.trigger_COMPARISON
                .trigger({ token, comparison }, { token })
                .catch(this.error)
                .then(this.log(`[trigger_COMPARISON] - Triggered: "${token}: ${comparison}"`));
        }
    }

    async action_SET_CURRENCY(token, number, currency) {
        const setLocalCurrency = number.toLocaleString(this.homey.__('helpers.locale'), { style: 'currency', currency: currency });
        this.homey.app.log('[action_SET_CURRENCY] - args', token, number, currency, setLocalCurrency);

        await this.updateTotals(token, { currency: setLocalCurrency });

        await this.createToken(token, { src: 'currency', value: setLocalCurrency });
    }

    async action_CALCULATION(token, calcType, number1, number2) {
        const calculation = calculationType(calcType, number1, number2);
        this.homey.app.log('[action_CALCULATION] - args', token, calcType, number1, number2, calculation);

        await this.updateTotals(token, { calculation });

        await this.createToken(token, { src: 'calculation', value: calculation, type: 'number' });
    }

    async action_CONVERT_NUMBER(token, number, decimals) {
        const calculation = convertNumber(number, decimals);
        this.homey.app.log('[action_CONVERT_NUMBER] - args', token, number, decimals);

        await this.updateTotals(token, { decimals: calculation });

        await this.createToken(token, { src: 'decimals', value: calculation, type: 'number' });
    }

    async action_CONVERT_TEXT(token, type, text) {
        const result = convertText(type, text);
        this.homey.app.log('[action_CONVERT_TEXT] - args', token, type, text);

        await this.updateTotals(token, { string: result });

        await this.createToken(token, { src: 'text', value: result });
    }

    async action_SET_ZONE_PERCENTAGE(zoneId, type, percentage) {
        this.homey.app.log('[action_SET_ZONE_PERCENTAGE] - args', zoneId, type, percentage);

        const devices = await this._api.devices.getDevices();
        for (const device of Object.values(devices)) {
            if (device.zone === zoneId && device.capabilities.includes(type)) {
                try {
                    await device.setCapabilityValue(type, percentage / 100);
                } catch (error) {
                    this.error('[action_SET_ZONE_PERCENTAGE][setCapabilityValue]', error);
                }
            }
        }
    }

    async action_SET_ZONE_COLOR(zoneId, color) {
        this.homey.app.log('[action_SET_ZONE_COLOR] - args', zoneId, color);

        const hsv = tinycolor(color).toHsv();
        const hue = Number((hsv.h / 360).toFixed(2));

        this.homey.app.log('[action_SET_ZONE_COLOR] - setting color to ', hsv.s, hue);

        const devices = await this._api.devices.getDevices();
        for (const device of Object.values(devices)) {
            if (device.zone === zoneId && device.capabilities.includes('light_hue')) {
                try {
                    await device.setCapabilityValue('light_hue', hue);
                } catch (error) {
                    this.error('[action_SET_ZONE_COLOR][light_hue][setCapabilityValue]', error);
                }
            }

            if (device.zone === zoneId && device.capabilities.includes('light_saturation')) {
                try {
                    await device.setCapabilityValue('light_saturation', hsv.s);
                } catch (error) {
                    this.error('[action_SET_ZONE_COLOR][light_saturation][setCapabilityValue]', error);
                }
            }
        }
    }

    async action_REPLACE_STRING(token, stringContains, replacementString, inputString) {
        if (typeof stringContains === 'string' && typeof replacementString === 'string' && typeof inputString === 'string') {
            const result = inputString.replace(stringContains, replacementString);
            this.homey.app.log('[action_REPLACE_STRING] - args', token, result);

            try {
                await this.updateTotals(token, { replacementString: result });

                await this.createToken(token, { src: 'replacementString', value: result });
            } catch (error) {
                this.error('[action_REPLACE_STRING]', error);
            }
        } else {
            this.error('Input format not string type');
        }
    }
}

module.exports = App;
