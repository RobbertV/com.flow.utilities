'use strict';

const Homey = require('homey');
const flowActions = require('./lib/flows/actions');
const { hoursMinutes, splitTime } = require('./lib/helpers');

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

        await flowActions.init(this.homey);
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
                    DURATIONS: [],
                    TOTALS: [],
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
        const totals = this.appSettings.TOTALS;
        totals.forEach((t) => {
            this.createToken(t.name, t.duration);

            if (t.comparison !== null) {
                this.createToken(`${t.name}-${this.homey.__('helpers.difference')}`, parseFloat(t.comparison), 'number');
            }
        });
    }

    async createToken(name, value = null, type = 'string') {
        if (!this.TOKENS[name]) {
            this.TOKENS[name] = await this.homey.flow.createToken(name, {
                type: type,
                title: name,
            });
        }

        await this.TOKENS[name].setValue(value);
    }

    // -------------------- FUNCTIONS ----------------------

    async action_START_DATE(name, comparison = null) {
        const date = new Date('2021-10-05');
        const newSettings = this.appSettings.DURATIONS.filter((setting) => setting.name !== name);

        await this.updateSettings({
            ...this.appSettings,
            DURATIONS: [...newSettings, { name, date, comparison }],
        });

        await this.createToken(name);
        if (comparison !== null) {
            await this.createToken(`${name}-${this.homey.__('helpers.difference')}`, parseFloat(comparison), 'number');
        }
    }

    async action_END_DATE(name, compare = null) {
        const date = new Date();
        const existing_conversion = this.appSettings.DURATIONS.find((x) => x.name === name);

        if (!existing_conversion) {
            throw new Error(`No conversion start found for ${name}`);
        }

        const duration = await this.calculateDuration(existing_conversion.date, date);
        const comparison = compare ? this.calculateComparison(existing_conversion.comparison, compare) : null;

        const DURATIONS = this.appSettings.DURATIONS.filter((conversion) => conversion.name !== name);
        const totals = this.appSettings.TOTALS.filter((total) => total.name !== name);

        await this.updateSettings({
            ...this.appSettings,
            DURATIONS: DURATIONS,
            TOTALS: [...totals, { name, duration, comparison }],
        });

        await this.createToken(name, duration);
        if (comparison) {
            await this.createToken(`${name}-${this.homey.__('helpers.difference')}`, parseFloat(comparison), 'number');
        }
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
