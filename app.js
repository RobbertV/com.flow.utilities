"use strict";

const Homey = require("homey");
const flowActions = require('./lib/flows/actions');
const { hoursMinutes } = require('./lib/helpers');

const _settingsKey = `${Homey.manifest.id}.settings`;

class App extends Homey.App {
  log() {
    console.log.bind(this, "[log]").apply(this, arguments);
  }

  error() {
    console.error.bind(this, "[error]").apply(this, arguments);
  }

  // -------------------- INIT ----------------------

  async onInit() {
    this.log(`${this.homey.manifest.id} - ${this.homey.manifest.version} started...`);

    await this.initSettings();
    await this.initTokens();

    this.log("[onInit] - Loaded settings", this.appSettings);

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
        this.log("[initSettings] - Found settings key", _settingsKey);
        this.appSettings = this.homey.settings.get(_settingsKey);

      } else {
        this.log(`Initializing ${_settingsKey} with defaults`);
        await this.updateSettings({
          CONVERSIONS: [],
          TOTALS: []
        });
      }
    } catch (err) {
      this.error(err);
    }
  }

  async updateSettings(settings) {
    try {      
      this.log("[updateSettings] - New settings:", settings);
      this.appSettings = settings;
      
      await this.homey.settings.set(_settingsKey, this.appSettings);  

    } catch (err) {
      this.error(err);
    }
  }

  async initTokens() {
    const totals = this.appSettings.TOTALS;
    totals.forEach(t => this.createToken(t.name, t.duration));
  }

  async createToken(name, duration = '') {
    if(!this.TOKENS[name]) {
      this.TOKENS[name] = await this.homey.flow.createToken(name, {
        type: "string",
        title: name
      });
    }

    await this.TOKENS[name].setValue(duration);
  }


// -------------------- FUNCTIONS ----------------------

  async action_START_DATE(name) {
    const date = new Date('2021-10-05');
    const newSettings = this.appSettings.CONVERSIONS.filter(setting => setting.name !== name);

    await this.updateSettings({
      ...this.appSettings,
      CONVERSIONS: [...newSettings, {name, date}]
    });

    await this.createToken(name);
  }
  
  async action_END_DATE(name) {
    const date = new Date();
    const existing_conversion = this.appSettings.CONVERSIONS.find(x => x.name === name);

    if(!existing_conversion) {
      throw new Error(`No conversion start found for ${name}`);
    }

    const duration = await this.calculateDiff(existing_conversion.date, date);

    const conversions = this.appSettings.CONVERSIONS.filter(conversion => conversion.name !== name);
    const totals = this.appSettings.TOTALS.filter(total => total.name !== name);

    await this.updateSettings({
      ...this.appSettings,
      CONVERSIONS: conversions,
      TOTALS: [...totals, {name, duration}]
    });

    await this.createToken(name, duration);
  }

  calculateDiff(start, end) {
    const startDate = new Date(start);
    const endDate = new Date(end);
   
    const diffInMilliseconds = Math.abs(startDate- endDate) / 1000;
    const total = hoursMinutes(diffInMilliseconds, this.homey.__);

    return total;
  }
}

module.exports = App;
