'use strict';

module.exports = {
    async getSettings({ homey }) {
        const _settingsKey = `com.flow.utilities.settings`;
        return homey.settings.get(_settingsKey);
    }
};
