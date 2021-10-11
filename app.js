'use strict';

const Homey = require('homey');
const flowActions = require('./lib/flows/actions');
const { calculateDuration, calculateComparison, formatToken, calculationType } = require('./lib/helpers');

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

        await this.initSettings();

        this.log('[onInit] - Loaded settings', this.appSettings);

        await this.setTokens(this.appSettings.VARIABLES, this.appSettings.VARIABLES);
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

            if (settingsInitialized) {
                this.log('[initSettings] - Found settings key', _settingsKey);
                this.appSettings = this.homey.settings.get(_settingsKey);
            } else {
                this.log(`Initializing ${_settingsKey} with defaults`);
                await this.updateSettings({
                    VARIABLES: [],
                    COMPARISONS: [],
                    TOTALS: []
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
        newSettings.forEach((t) => {
            this.createToken(t, { src: 'duration' });
            this.createToken(t, { src: 'currency', type: 'string' });
            this.createToken(t, { src: 'comparison', type: 'number' });
            this.createToken(t, { src: 'calculation', type: 'number' });
        });

        if (oldSettings.length) {
            const difference = oldSettings.filter((x) => !newSettings.includes(x));
            difference.forEach((d) => {
                this.removeToken(d, 'duration');
                this.removeToken(d, 'currency');
                this.removeToken(d, 'comparison');
                this.removeToken(d, 'calculation');
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
            this.log(`[createToken] - created Token => ID: ${id} - Title: ${title} - Type: ${type} - Value: ${value}`);
        }

        await this.TOKENS[id].setValue(value);
    }

    async removeToken(name, src) {
        const suffix = this.homey.__(`helpers.${src}`);
        let title = `${name} ${suffix}`;
        const id = formatToken(title);

        if (this.TOKENS[id]) {
            await this.TOKENS[id].unregister();
            this.log(`[removeToken] - removed Token => ID: ${id} - Title: ${title}`);
        }
    }

    // -------------------- FUNCTIONS ----------------------

    async action_START(token, paramOptions) {
        const defaultOptions = {
            dateStart: null,
            comparison: null
        };
        const options = { ...defaultOptions, ...paramOptions };
        const { dateStart, comparison } = options;
        const date = dateStart ? new Date() : dateStart;
        const newSettings = this.appSettings.COMPARISONS.filter((setting) => setting.token !== token);

        await this.updateSettings({
            ...this.appSettings,
            COMPARISONS: [...newSettings, { token, date, comparison }]
        });
    }

    async action_END(token, value = null) {
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

        await this.createToken(token, { src: 'duration', value: duration });
        if (comparison) {
            await this.createToken(token, { src: 'comparison', value: parseFloat(comparison), type: 'number' });
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

        await this.createToken(token, { src: 'calculation', value: calculation });
    }
}

module.exports = App;
