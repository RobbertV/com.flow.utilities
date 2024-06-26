const { variableAutoComplete, zoneAutoComplete } = require('../helpers');

exports.init = async function (ctx) {
    ctx.homey.app.trigger_COMPARISON = ctx.homey.flow
        .getTriggerCard(`trigger_COMPARISON`)
        .registerArgumentAutocompleteListener('variable', async (query) => variableAutoComplete(ctx, query, true))
        .registerRunListener(async (args, state) => args.variable.name === ctx.homey.__('helpers.all') || args.variable.name === state.token);

    ctx.homey.app.trigger_DURATION = ctx.homey.flow
        .getTriggerCard(`trigger_DURATION`)
        .registerArgumentAutocompleteListener('variable', async (query) => variableAutoComplete(ctx, query, true))
        .registerRunListener(async (args, state) => args.variable.name === ctx.homey.__('helpers.all') || args.variable.name === state.token);

    // ToDo: Remove deprecated
    ctx.homey.app.trigger_ZONE_ON = ctx.homey.flow
        .getTriggerCard(`trigger_ZONE_ON`)
        .registerArgumentAutocompleteListener('zone', async (query) => zoneAutoComplete(ctx, query, true))
        .registerRunListener(async (args, state) => args.zone.id === state.zone);

    // ToDo: Remove deprecated
    ctx.homey.app.trigger_ZONE_OFF = ctx.homey.flow
        .getTriggerCard(`trigger_ZONE_OFF`)
        .registerArgumentAutocompleteListener('zone', async (query) => zoneAutoComplete(ctx, query, true))
        .registerRunListener(async (args, state) => args.zone.id === state.zone);

    // ToDo: Remove deprecated
    ctx.homey.app.trigger_DEVICE_ZONE_ON = ctx.homey.flow
        .getTriggerCard(`trigger_DEVICE_ZONE_ON`)
        .registerArgumentAutocompleteListener('zone', async (query) => zoneAutoComplete(ctx, query, true))
        .registerRunListener(async (args, state) => args.zone.id === state.zone);

    // ToDo: Remove deprecated
    ctx.homey.app.trigger_DEVICE_ZONE_OFF = ctx.homey.flow
        .getTriggerCard(`trigger_DEVICE_ZONE_OFF`)
        .registerArgumentAutocompleteListener('zone', async (query) => zoneAutoComplete(ctx, query, true))
        .registerRunListener(async (args, state) => args.zone.id === state.zone);

    const trigger_ZONE_ON = ctx.homey.flow.getTriggerCard(`trigger_ZONE_ON`).on('update', () => this.setUpdateListener(trigger_ZONE_ON, ctx));
    const trigger_ZONE_OFF = ctx.homey.flow.getTriggerCard(`trigger_ZONE_OFF`).on('update', () => this.setUpdateListener(trigger_ZONE_OFF, ctx));
    const trigger_DEVICE_ZONE_ON = ctx.homey.flow.getTriggerCard(`trigger_DEVICE_ZONE_ON`).on('update', () => this.setUpdateListener(trigger_DEVICE_ZONE_ON, ctx));
    const trigger_DEVICE_ZONE_OFF = ctx.homey.flow.getTriggerCard(`trigger_DEVICE_ZONE_OFF`).on('update', () => this.setUpdateListener(trigger_DEVICE_ZONE_OFF, ctx));
};

exports.setUpdateListener = async function (flowCard, ctx) {
    flowCard.getArgumentValues().then(async (values) => {
        ctx.log(`[onUpdate] trigger ZONE flowCard - `, values);

        let zoneChanges = {};
        const oldZones = Object.keys(ctx.appSettings.ZONES);
        values.forEach((v) => (zoneChanges = { ...zoneChanges, [v.zone.id]: false }));

        await ctx.updateSettings({
            ...ctx.appSettings,
            ZONES: zoneChanges
        });

        const newZones = Object.keys(zoneChanges);

        ctx.setCheckZoneOnOffInterval(oldZones, newZones);
    });
};
