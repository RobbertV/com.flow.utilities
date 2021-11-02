const { variableAutoComplete, zoneAutoComplete } = require('../helpers');

exports.init = async function (ctx) {
    const action_START_DURATION = ctx.homey.flow.getActionCard('action_START_DURATION');
    action_START_DURATION
        .registerRunListener(async (args) => {
            ctx.homey.app.log('[action_START_DURATION]', args);

            const { variable } = args;
            const { name } = variable;

            await ctx.homey.app.action_START(name, { dateStart: true });
        })
        .registerArgumentAutocompleteListener('variable', async (query) => variableAutoComplete(ctx, query));

    const action_END_DURATION = ctx.homey.flow.getActionCard('action_END_DURATION');
    action_END_DURATION
        .registerRunListener(async (args) => {
            ctx.homey.app.log('[action_END_DURATION]', args);

            const { variable } = args;
            const { name } = variable;

            await ctx.homey.app.action_END(name, 'duration');
        })
        .registerArgumentAutocompleteListener('variable', async (query) => variableAutoComplete(ctx, query));

    const action_START_COMPARE = ctx.homey.flow.getActionCard('action_START_COMPARE');
    action_START_COMPARE
        .registerRunListener(async (args) => {
            ctx.homey.app.log('[action_START_COMPARE]', args);

            const { variable, value } = args;
            const { name } = variable;

            await ctx.homey.app.action_START(name, { comparison: value });
        })
        .registerArgumentAutocompleteListener('variable', async (query) => variableAutoComplete(ctx, query));

    const action_END_COMPARE = ctx.homey.flow.getActionCard('action_END_COMPARE');
    action_END_COMPARE
        .registerRunListener(async (args) => {
            ctx.homey.app.log('[action_END_COMPARE]', args);

            const { variable, value } = args;
            const { name } = variable;

            await ctx.homey.app.action_END(name, 'comparison', value);
        })
        .registerArgumentAutocompleteListener('variable', async (query) => variableAutoComplete(ctx, query));

    const action_SET_CURRENCY = ctx.homey.flow.getActionCard('action_SET_CURRENCY');
    action_SET_CURRENCY
        .registerRunListener(async (args) => {
            ctx.homey.app.log('[action_SET_CURRENCY]', args);
            const { currency, value, variable } = args;
            const { name } = variable;
            await ctx.homey.app.action_SET_CURRENCY(name, value, currency);
        })
        .registerArgumentAutocompleteListener('variable', async (query) => variableAutoComplete(ctx, query));

    const action_CALCULATION = ctx.homey.flow.getActionCard('action_CALCULATION');
    action_CALCULATION
        .registerRunListener(async (args) => {
            ctx.homey.app.log('[action_CALCULATION]', args);
            const { value1, value2, calctype, variable } = args;
            const { name } = variable;
            await ctx.homey.app.action_CALCULATION(name, calctype, value1, value2);
        })
        .registerArgumentAutocompleteListener('variable', async (query) => variableAutoComplete(ctx, query));

    const action_CONVERT_NUMBER = ctx.homey.flow.getActionCard('action_CONVERT_NUMBER');
    action_CONVERT_NUMBER
        .registerRunListener(async (args) => {
            ctx.homey.app.log('[action_CONVERT_NUMBER]', args);
            const { number, decimals, variable } = args;
            const { name } = variable;
            await ctx.homey.app.action_CONVERT_NUMBER(name, number, decimals);
        })
        .registerArgumentAutocompleteListener('variable', async (query) => variableAutoComplete(ctx, query));

    const action_SET_ZONE_ONOFF = ctx.homey.flow.getActionCard('action_SET_ZONE_ONOFF');
    action_SET_ZONE_ONOFF
        .registerRunListener(async (args) => {
            ctx.homey.app.log('[action_SET_ZONE_ONOFF]');
            const { value, zone, devicetype } = args;
            const { id } = zone;
            await ctx.homey.app.action_SET_ZONE_ONOFF(id, value, devicetype);
        })
        .registerArgumentAutocompleteListener('zone', async (query) => await zoneAutoComplete(ctx, query));

        const action_TOGGLE_ZONE_ONOFF = ctx.homey.flow.getActionCard('action_TOGGLE_ZONE_ONOFF');
        action_TOGGLE_ZONE_ONOFF
            .registerRunListener(async (args) => {
                ctx.homey.app.log('[action_TOGGLE_ZONE_ONOFF]');
                const { zone, devicetype } = args;
                const { id } = zone;
                await ctx.homey.app.action_TOGGLE_ZONE_ONOFF(id, devicetype);
            })
            .registerArgumentAutocompleteListener('zone', async (query) => await zoneAutoComplete(ctx, query));

    const action_SET_ZONE_PERCENTAGE = ctx.homey.flow.getActionCard('action_SET_ZONE_PERCENTAGE');
    action_SET_ZONE_PERCENTAGE
        .registerRunListener(async (args) => {
            ctx.homey.app.log('[action_SET_ZONE_PERCENTAGE]', args);
            const { type, percentage, zone } = args;
            const { id } = zone;
            await ctx.homey.app.action_SET_ZONE_PERCENTAGE(id, type, percentage);
        })
        .registerArgumentAutocompleteListener('zone', async (query) => await zoneAutoComplete(ctx, query));

    const action_SET_ZONE_COLOR = ctx.homey.flow.getActionCard('action_SET_ZONE_COLOR');
    action_SET_ZONE_COLOR
        .registerRunListener(async (args) => {
            ctx.homey.app.log('[action_SET_ZONE_COLOR]', args);
            const { color, zone } = args;
            const { id } = zone;
            await ctx.homey.app.action_SET_ZONE_COLOR(id, color);
        })
        .registerArgumentAutocompleteListener('zone', async (query) => await zoneAutoComplete(ctx, query));
};
