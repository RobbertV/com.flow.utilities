exports.init = async function (ctx) {
    const action_START = ctx.homey.flow.getActionCard('action_START');
    action_START.registerRunListener(async (args) => {
        ctx.homey.app.log('[action_START]', args);
        const { name } = args;
        await ctx.homey.app.action_START(name, true);
    });

    const action_END = ctx.homey.flow.getActionCard('action_END');
    action_END.registerRunListener(async (args) => {
        ctx.homey.app.log('[action_END]', args);
        const { name } = args;
        await ctx.homey.app.action_END(name, true);
    });

    const action_START_COMPARE = ctx.homey.flow.getActionCard('action_START_COMPARE');
    action_START_COMPARE.registerRunListener(async (args) => {
        ctx.homey.app.log('[action_START_COMPARE]', args);
        await ctx.homey.app.action_START(args.name, true,  args.value);
    });

    const action_END_COMPARE = ctx.homey.flow.getActionCard('action_END_COMPARE');
    action_END_COMPARE.registerRunListener(async (args) => {
        ctx.homey.app.log('[action_END_COMPARE]', args);
        await ctx.homey.app.action_END(args.name, true,  args.value);
    });

    const action_REMOVE_PREVIOUS = ctx.homey.flow.getActionCard('action_REMOVE_PREVIOUS');
    action_REMOVE_PREVIOUS.registerRunListener(async (args) => {
        ctx.homey.app.log('[action_REMOVE_PREVIOUS]', args);
        await ctx.homey.app.action_REMOVE_PREVIOUS(args.name.name);
    });

    action_REMOVE_PREVIOUS.registerArgumentAutocompleteListener('name', async (query, args) => {
        const totals = ctx.appSettings.TOTALS.map((t) => ({ name: t.name}));
        const comparisons = ctx.appSettings.COMPARISONS.map((t) => ({ name: t.name}));
        const results = [...totals, ...comparisons];

        return results.filter((result) => result && result.name.toLowerCase().includes(query.toLowerCase()));
    });

    this.setUpdateListeners(ctx);
};

exports.setUpdateListeners = async function(ctx) {
    const action_START = ctx.homey.flow.getActionCard('action_START');
    action_START.on("update", () => {
        action_START.getArgumentValues().then(async (values) => {
            ctx.log('[onUpdate] action_START - ', values);
            const [ args ] = values;
            await ctx.action_START(args.name);
        });
    });


    const action_START_COMPARE = ctx.homey.flow.getActionCard('action_START_COMPARE');
    action_START_COMPARE.on("update", () => {
        action_START_COMPARE.getArgumentValues().then(async (values) => {
            ctx.log('[onUpdate] action_START_COMPARE - ', values);
            const [ args ] = values;
            await ctx.action_START(args.name);
        });
    });
}
