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

    ctx.homey.app.trigger_ZONE_CHANGE = ctx.homey.flow.getTriggerCard(`trigger_ZONE_CHANGE`).registerArgumentAutocompleteListener('zone', async (query) => zoneAutoComplete(ctx, query, true)).registerRunListener(async (args, state) => args.zone.id === state.zone && !!parseInt(args.onoff) === state.onoff);

    const trigger_ZONE_CHANGE = ctx.homey.flow.getTriggerCard(`trigger_ZONE_CHANGE`).on('update', () => {
        trigger_ZONE_CHANGE.getArgumentValues().then(async (values) => {
            ctx.log('[onUpdate] trigger_ZONE_CHANGE - ', values);

            await ctx.updateSettings({
                ...ctx.appSettings,
                ZONES: {...ctx.appSettings.ZONES, [values[0].zone.id]: false }
            });
        });
    });
};
