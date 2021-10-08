'use strict';

const Homey = require('homey');
const HomeyAPI = require('athom-api').HomeyAPI;
const flowActions = require('./lib/flows/actions');
const { splitTime, formatToken } = require('./lib/helpers');

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

        await this.initSettings();
        await this.initTokens();

        this.log('[onInit] - Loaded settings', this.appSettings);

        this._api = await HomeyAPI.forCurrentHomey(this.homey);

        await this.setHomeyDevices();
        await this.setHomeyDevicesInterval();
        await flowActions.init(this);
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

            this.TOKENS = {};

            if (settingsInitialized) {
                this.log('[initSettings] - Found settings key', _settingsKey);
                this.appSettings = this.homey.settings.get(_settingsKey);
            } else {
                this.log(`Initializing ${_settingsKey} with defaults`);
                await this.updateSettings({
                    COMPARISONS: [],
                    TOTALS: []
                });
            }
        } catch (err) {
            this.error(err);
        }
    }

    async updateSettings(settings) {
        try {
            this.log('[updateSettings] - New settings:', settings);
            this.appSettings = settings;

            await this.homey.settings.set(_settingsKey, this.appSettings);
        } catch (err) {
            this.error(err);
        }
    }

    async initTokens() {
        const totals = [...this.appSettings.TOTALS, ...this.appSettings.COMPARISONS];

        totals.forEach((t) => {
            this.createToken(t.name, t.duration);

            if (t.comparison !== null) {
                this.createToken(t.name, parseFloat(t.comparison), 'number');
            }
        });

        for (var i = 0; i < 3; i++) {
            this.createToken(i + 1, null, 'string', 'currency');
        }
    }

    async createToken(name, value = null, type = 'string', src = null) {
        const comparison = this.homey.__('helpers.difference');
        const duration = this.homey.__('helpers.duration');
        const currency = this.homey.__('helpers.currency');
        let title = name;

        this.log('[createToken] - creating Token for', name, value, type, src);

        if (!src && type === 'number') title = `${name} (${comparison})`;
        if (!src && type === 'string') title = `${name} (${duration})`;
        if (src === 'currency' && type === 'string') title = `${currency} ${name}`;

        const tokenId = formatToken(title);

        if (!this.TOKENS[title]) {
            this.TOKENS[title] = await this.homey.flow.createToken(tokenId, {
                type,
                title
            });
            this.log('[createToken] - created Token', tokenId, title, type);
        } else {
            this.log('[createToken] - Token already exists!', name);
        }

        await this.TOKENS[title].setValue(value);
    }

    async removeToken(name) {
        const titles = [name, `${name}-${this.homey.__('helpers.difference')}`];

        titles.forEach(async (t) => {
            if (this.TOKENS[t]) {
                await this.TOKENS[t].unregister();
            }
        });
    }

    async setHomeyDevices() {
        this.DEVICES = Object.values(await this._api.devices.getDevices({ online: true }));
        this.DEVICES = this.DEVICES.map((c) => ({ name: c.name })).sort((a, b) => a.name.localeCompare(b.name));

        this.log(`[setHomeyDevices] this.DEVICES: `, this.DEVICES);
    }

    async setHomeyDevicesInterval() {
        const REFRESH_INTERVAL = 1000 * (10 * 60);

        this.log(`[setHomeyDevicesInterval] -  start interval`);
        this.onPollInterval = this.homey.setInterval(this.setHomeyDevices.bind(this), REFRESH_INTERVAL);
    }

    // -------------------- FUNCTIONS ----------------------

    async action_START(name, dateStart = null, comparison = null) {
        const date = dateStart ? new Date() : dateStart;
        const newSettings = this.appSettings.COMPARISONS.filter((setting) => setting.name !== name);

        await this.updateSettings({
            ...this.appSettings,
            COMPARISONS: [...newSettings, { name, date, comparison }]
        });

        await this.createToken(name);
        if (comparison !== null) {
            await this.createToken(name, parseFloat(comparison), 'number');
        }
    }

    async action_END(name, value = null) {
        this.homey.app.log('[action_END]: ', name);
        const existing_conversion = this.appSettings.COMPARISONS.find((x) => x.name === name);
        const date = existing_conversion.date ? new Date() : null;

        if (!existing_conversion) {
            throw new Error(`No conversion start found for ${name}`);
        } else {
            this.homey.app.log('[action_END]: found existiong comparison', existing_conversion);
        }

        const duration = date ? this.calculateDuration(existing_conversion.date, date) : null;
        const comparison = value ? this.calculateComparison(existing_conversion.comparison, value) : null;

        const comparisons = this.appSettings.COMPARISONS.filter((conversion) => conversion.name !== name);
        const totals = this.appSettings.TOTALS.filter((total) => total.name !== name);

        await this.updateSettings({
            ...this.appSettings,
            COMPARISONS: comparisons,
            TOTALS: [...totals, { name, duration, comparison }]
        });

        await this.createToken(name, duration);
        if (comparison) {
            await this.createToken(name, parseFloat(comparison), 'number');
        }
    }

    async action_REMOVE_PREVIOUS(name) {
        this.homey.app.log('[action_REMOVE_PREVIOUS] - remove: ', name);
        const comparisons = this.appSettings.COMPARISONS.filter((d) => d.name !== name);
        const totals = this.appSettings.TOTALS.filter((t) => t.name !== name);

        await this.updateSettings({
            ...this.appSettings,
            COMPARISONS: comparisons,
            TOTALS: totals
        });

        await this.removeToken(name);
    }

    async action_SET_CURRENCY(token, number, currency) {
        const setLocalCurrency = number.toLocaleString(this.homey.__('helpers.locale'), { style: 'currency', currency: currency });
        this.homey.app.log('action_SET_CURRENCY - args', number, currency, setLocalCurrency);

        await this.createToken(token, setLocalCurrency, 'string', 'currency');
    }

    calculateDuration(startDate, endDate) {
        const diffInMilliseconds = Math.abs(startDate - endDate) / 1000;
        return splitTime(diffInMilliseconds, this.homey.__);
    }

    calculateComparison(start, end) {
        const comparison = parseFloat(end) - parseFloat(start);
        return comparison ? comparison.toFixed(2) : 0;
    }
}

module.exports = App;
