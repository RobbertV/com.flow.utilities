'use strict';

const Homey = require('homey');
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

        await this.initSettings();

        this.log('[onInit] - Loaded settings', this.appSettings);
        // this.sendNotifications();

        await this.setTokens(this.appSettings.VARIABLES, this.appSettings.VARIABLES);
        await flowActions.init(this);
        await flowTriggers.init(this);

        await this.setupWidget();
    }
    // -------------------- Notification updates ----------------------
    async sendNotifications() {
        try {
            const ntfy2023101701 = `[Flow Utilities] (1/2) - Zone trigger & action cards are now deprecated.`;
            const ntfy2023101702 = `[Flow Utilities] (2/2) - Visit forum for more info: https://t.ly/9NeAG`;
            await this.homey.notifications.createNotification({
                excerpt: ntfy2023101702
            });
            await this.homey.notifications.createNotification({
                excerpt: ntfy2023101701
            });
        } catch (error) {
            this.log('sendNotifications - error', console.error());
        }
    }

    // -------------------- SETTINGS ----------------------

    async initSettings() {
        let settingsInitialized = false;
        this.homey.settings.getKeys().forEach((key) => {
            if (key == _settingsKey) {
                settingsInitialized = true;
            }
        });

        if (settingsInitialized) {
            this.log('[initSettings] - Found settings key', _settingsKey);
            this.appSettings = this.homey.settings.get(_settingsKey);

            // Temporary fix for remmoval of ZONE functions
            if (this.appSettings?.ZONES) {
                try {
                    this.log('[initSettings][ZONES] - Found settings update to new specification');
                    const allowed = ['COMPARISONS', 'TOTALS', 'VARIABLES'];

                    const filteredSettings = Object.keys(this.appSettings)
                        .filter((key) => allowed.includes(key))
                        .reduce((obj, key) => {
                            return {
                                ...obj,
                                [key]: this.appSettings[key]
                            };
                        }, {});

                    // this.log('[Settings cleanup] - Filtered settings', filteredSettings);
                    await this.updateSettings({
                        ...filteredSettings
                    });
                } catch (err) {
                    this.error('[initSettings]', err);
                }
            }
        } else {
            this.log(`Initializing ${_settingsKey} with defaults`);
            try {
                await this.updateSettings({
                    VARIABLES: [],
                    COMPARISONS: [],
                    TOTALS: []
                });
            } catch (err) {
                this.error('[initSettings][init with defaults]', err);
            }
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
            this.error('[updateSettings]', err);
        }
    }

    async removeSettings(token) {
        const COMPARISONS = this.appSettings.COMPARISONS.filter((setting) => setting.token !== token);
        const TOTALS = this.appSettings.TOTALS.filter((setting) => setting.token !== token);

        this.log('[removeSettings] - Remove settings for', token);
        try {
            await this.updateSettings({
                ...this.appSettings,
                COMPARISONS,
                TOTALS
            });
        } catch (err) {
            this.error('[removeSettings]', err);
        }
    }

    async updateTotals(token, newValueObj) {
        const currentTokenTotals = this.appSettings.TOTALS.find((total) => total.token === token);
        const otherTotals = this.appSettings.TOTALS.filter((total) => total.token !== token);
        const newTokenTotals = { token, ...currentTokenTotals, ...newValueObj };

        try {
            await this.updateSettings({
                ...this.appSettings,
                TOTALS: [...otherTotals, newTokenTotals]
            });
        } catch (err) {
            this.error('[updasteTotals]', err);
        }
    }

    async setTokens(newVariables, oldVariables = []) {
        try {
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
        } catch (err) {
            this.error('[setTokens]', err);
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
            try {
                this.TOKENS[id] = await this.homey.flow.createToken(id, {
                    type,
                    title
                });
                this.log(`[createToken] - created Token => ID: ${id} - Title: ${title} - Type: ${type}`);
            } catch (error) {
                return this.error(`[creatingToken] ${error}`);
            }
        }

        if (this.TOKENS[id]) {
            try {
                await this.TOKENS[id].setValue(value);
                this.log(`[createToken] - set token value => ID: ${id} - Value: ${value}`);
            } catch (error) {
                return this.error(`[setToken value] ${error}`);
            }
        }
    }

    async removeToken(name, src) {
        const suffix = this.homey.__(`helpers.${src}`);
        let title = `${name} ${suffix}`;
        const id = formatToken(title);

        if (this.TOKENS[id]) {
            try {
                await this.TOKENS[id].unregister();
                // Remove token from list, since unregister doesn't do this.
                delete this.TOKENS[id];

                this.log(`[removeToken] - removed Token => ID: ${id} - Title: ${title} - ${!!this.TOKENS[id]}`);
            } catch (err) {
                this.error('[removeToken]', err);
            }
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
                .catch((err) => this.error('[trigger_DURATION]', err))
                .then((res) => this.log(`[trigger_DURATION] - Triggered: "${token}: ${duration} ${durationInSeconds}"`));
        }

        if (src === 'comparison' && comparison !== null) {
            await this.updateTotals(token, { comparison });
            await this.createToken(token, { src, value: parseFloat(comparison), type: 'number' });

            this.homey.app.trigger_COMPARISON
                .trigger({ token, comparison }, { token })
                .catch((err) => this.error('[trigger_COMPARISON]', err))
                .then((res) => this.log(`[trigger_COMPARISON] - Triggered: "${token}: ${comparison}"`));
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

    async action_REPLACE_STRING(token, stringContains, replacementString, inputString) {
        if (typeof stringContains === 'string' && typeof replacementString === 'string' && typeof inputString === 'string') {
            const result = inputString.replaceAll(stringContains, replacementString);
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

    async setupWidget() {
        const widget = this.homey.dashboards.getWidget('flow-utilities-variables');

        widget.registerSettingAutocompleteListener('selectVariable', async (query, settings) => {
            this.log('[setupWidget] - Autocomplete query:', query, this.appSettings.VARIABLES);
            const variables = this.appSettings.VARIABLES.map((item) => {
                return {
                    id: item,
                    name: item
                };
            });

            return variables.filter((item) => item.name.toLowerCase().includes(query.toLowerCase()));
        });
    }
}

module.exports = App;
