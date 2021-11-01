'use strict';

const Homey = require('homey');
const HomeyAPI = require('athom-api').HomeyAPI;
const tinycolor = require('tinycolor2');
const flowActions = require('./lib/flows/actions');
const flowTriggers = require('./lib/flows/triggers');
const { calculateDuration, calculateComparison, formatToken, calculationType, convertNumber } = require('./lib/helpers');

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

        this._api = await HomeyAPI.forCurrentHomey(this.homey);

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

    async setTokens(newSettings, oldSettings = []) {
        await newSettings.forEach((t) => {
            if (!this.TOKENS[t]) {
                this.createToken(t, { src: 'duration' });
                this.createToken(t, { src: 'currency', type: 'string' });
                this.createToken(t, { src: 'comparison', type: 'number' });
                this.createToken(t, { src: 'calculation', type: 'number' });
                this.createToken(t, { src: 'decimals', type: 'number' });
            }
        });

        if (oldSettings.length) {
            const difference = oldSettings.filter((x) => !newSettings.includes(x));
            difference.forEach((d) => {
                this.removeToken(d, 'duration');
                this.removeToken(d, 'currency');
                this.removeToken(d, 'comparison');
                this.removeToken(d, 'calculation');
                this.removeToken(d, 'decimals');
                this.removeSettings(d);
            });
        }
    }

    async createToken(name, paramOptions) {
        const defaultOptions = {
            src: null,
            value: null,
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
        await this.TOKENS[id].setValue(value);
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

    // -------------------- FUNCTIONS ----------------------

    async setCheckZoneOnOffInterval() {
        const devices = Object.values(await this._api.devices.getDevices());
        const zones = Object.keys(this.appSettings.ZONES);
        const that = this;
        for (const device of devices) {
            if (device.capabilitiesObj.onoff && zones.includes(device.zone)) {
                device.makeCapabilityInstance('onoff', () => {
                    that.checkZoneOnOff(device.zone);
                });
            }
        }
    }

    async checkZoneOnOff(zone) {
        const devices = Object.values(await this._api.devices.getDevices());

        const onoffDevice = devices.filter((d) => d.zone == zone && d.capabilitiesObj.onoff && !d.settings.energy_alwayson && !d.settings.override_onoff);
        const isOn = onoffDevice.some((v) => v.settings && v.capabilitiesObj.onoff.value === true);
        const isOff = onoffDevice.every((v) => v.capabilitiesObj.onoff.value === false);

        let zoneChanges = this.appSettings.ZONES;

        if (isOn && !this.appSettings.ZONES[zone]) {

            await this.updateSettings({
                ...this.appSettings,
                ZONES: { ...zoneChanges, [zone]: isOn }
            });

            this.homey.app.trigger_ZONE_CHANGE
                .trigger({}, { zone, onoff: true })
                .catch(this.error)
                .then(this.log(`[trigger_ZONE_CHANGE] - Triggered - ${zone} - true`));
        } else if (isOff && !!this.appSettings.ZONES[zone]) {

            await this.updateSettings({
                ...this.appSettings,
                ZONES: { ...zoneChanges, [zone]: !isOff }
            });

            this.homey.app.trigger_ZONE_CHANGE
                .trigger({}, { zone, onoff: false })
                .catch(this.error)
                .then(this.log(`[trigger_ZONE_CHANGE] - Triggered - ${zone} - false`));
        }

        this.setCheckZoneOnOffInterval();
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
        const duration = date ? calculateDuration(existingDate, date, this.homey.__, this.homey.app.log) : null;
        const comparison = value ? calculateComparison(existing_comparison.comparison, value) : null;

        const totals = this.appSettings.TOTALS.filter((total) => total.token !== token);

        await this.updateSettings({
            ...this.appSettings,
            TOTALS: [...totals, { token, duration, comparison }]
        });

        if (src === 'duration' && duration) {
            await this.createToken(token, { src, value: duration });
            this.homey.app.trigger_DURATION
                .trigger({ token, duration }, { token })
                .catch(this.error)
                .then(this.log(`[trigger_DURATION] - Triggered: "${token}: ${duration}"`));
        }

        if (src === 'comparison' && comparison !== null) {
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

        await this.createToken(token, { src: 'currency', value: setLocalCurrency });
    }

    async action_CALCULATION(token, calcType, number1, number2) {
        const calculation = calculationType(calcType, number1, number2);
        this.homey.app.log('[action_CALCULATION] - args', token, calcType, number1, number2, calculation);

        await this.createToken(token, { src: 'calculation', value: calculation, type: 'number' });
    }

    async action_CONVERT_NUMBER(token, number, decimals) {
        const calculation = convertNumber(number, decimals);
        this.homey.app.log('[action_CONVERT_NUMBER] - args', token, number, decimals);

        await this.createToken(token, { src: 'decimals', value: calculation, type: 'number' });
    }

    async action_SET_ZONE_ONOFF(zoneId, valueString) {
        this.homey.app.log('[action_SET_ZONE_ONOFF] - args', zoneId, 'onoff', valueString);

        const devices = await this._api.devices.getDevices();
        for (const device of Object.values(devices)) {
            if (device.zone === zoneId && device.capabilities.includes('onoff')) {
                const value = parseInt(valueString);
                const onOff = value === 2 ? !device.capabilitiesObj.onoff.value : !!value;

                this.homey.app.log('[action_SET_ZONE_ONOFF] - device', device.name, 'onoff', onOff);

                device.setCapabilityValue('onoff', onOff);
            }
        }
    }

    async action_SET_ZONE_PERCENTAGE(zoneId, type, percentage) {
        this.homey.app.log('[action_SET_ZONE_PERCENTAGE] - args', zoneId, type, percentage);

        const devices = await this._api.devices.getDevices();
        for (const device of Object.values(devices)) {
            if (device.zone === zoneId && device.capabilities.includes(type)) {
                device.setCapabilityValue(type, percentage / 100);
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
                device.setCapabilityValue('light_hue', hue);
            }

            if (device.zone === zoneId && device.capabilities.includes('light_saturation')) {
                device.setCapabilityValue('light_saturation', hsv.s);
            }
        }
    }
}

module.exports = App;
