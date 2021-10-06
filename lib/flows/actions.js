exports.init = async function (ctx) {
    const action_START_DATE = ctx.homey.flow.getActionCard('action_START_DATE');
    action_START_DATE.registerRunListener(async (args) => {
        ctx.homey.app.log('[action_START_DATE]', args);
        const { name } = args;
        await ctx.homey.app.action_START_DATE(name);
    });

    const action_END_DATE = ctx.homey.flow.getActionCard('action_END_DATE');
    action_END_DATE.registerRunListener(async (args) => {
        ctx.homey.app.log('[action_END_DATE]', args);
        const { name } = args;
        await ctx.homey.app.action_END_DATE(name);
    });

    const action_START_DATE_COMPARE = ctx.homey.flow.getActionCard('action_START_DATE_COMPARE');
    action_START_DATE_COMPARE.registerRunListener(async (args) => {
        ctx.homey.app.log('[action_START_DATE_COMPARE]', args);
        await ctx.homey.app.action_START_DATE(args.name, args.value);
    });

    const action_END_DATE_COMPARE = ctx.homey.flow.getActionCard('action_END_DATE_COMPARE');
    action_END_DATE_COMPARE.registerRunListener(async (args) => {
        ctx.homey.app.log('[action_END_DATE_COMPARE]', args);
        await ctx.homey.app.action_END_DATE(args.name, args.value);
    });

    const action_REMOVE_PREVIOUS = ctx.homey.flow.getActionCard('action_REMOVE_PREVIOUS');
    action_REMOVE_PREVIOUS.registerRunListener(async (args) => {
        ctx.homey.app.log('[action_REMOVE_PREVIOUS]', args);
        await ctx.homey.app.action_REMOVE_PREVIOUS(args.name.name);
    });

    action_REMOVE_PREVIOUS.registerArgumentAutocompleteListener('name', async (query, args) => {
        const totals = ctx.appSettings.TOTALS.map((t) => ({ name: t.name}));
        const durations = ctx.appSettings.DURATIONS.map((t) => ({ name: t.name}));
        const results = [...totals, ...durations];

        return results.filter((result) => result && result.name.toLowerCase().includes(query.toLowerCase()));
    });
};
