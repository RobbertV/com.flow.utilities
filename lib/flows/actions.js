exports.init = async function (ctx) {
    const action_START = ctx.homey.flow.getActionCard('action_START');
    action_START.registerRunListener(async (args) => {
        ctx.homey.app.log('[action_START]', args);

        const { device, duration, value } = args;
        const { name } = device;

        await ctx.homey.app.action_START(name, !!parseInt(duration), value);
    })
    .registerArgumentAutocompleteListener('device', async (query, args) => {
        const variables = ctx.appSettings.VARIABLES.map((c) => ({ name: c }));
        return variables.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
    });


    const action_END = ctx.homey.flow.getActionCard('action_END');
    action_END.registerRunListener(async (args) => {
        ctx.homey.app.log('[action_END]', args);

        const { device, value } = args;
        const { name } = device;

        await ctx.homey.app.action_END(name, value);
    })
    .registerArgumentAutocompleteListener('device', async (query, args) => {
        const variables = ctx.appSettings.VARIABLES.map((c) => ({ name: c }));
        return variables.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
    });


    const action_REMOVE_PREVIOUS = ctx.homey.flow.getActionCard('action_REMOVE_PREVIOUS');
    action_REMOVE_PREVIOUS.registerRunListener(async (args) => {
        ctx.homey.app.log('[action_REMOVE_PREVIOUS]', args);

        const { device } = args;
        const { name } = device;

        await ctx.homey.app.action_REMOVE_PREVIOUS(name);
    })
    .registerArgumentAutocompleteListener('device', async (query, args) => {
        const totals = ctx.appSettings.TOTALS.map((t) => ({ name: t.name }));
        const comparisons = ctx.appSettings.COMPARISONS.map((t) => ({ name: t.name }));
        const results = [...totals, ...comparisons];

        return results.filter((result) => result && result.name.toLowerCase().includes(query.toLowerCase()));
    });


    const action_SET_CURRENCY = ctx.homey.flow.getActionCard('action_SET_CURRENCY');
    action_SET_CURRENCY.registerRunListener(async (args) => {
        ctx.homey.app.log('[action_SET_CURRENCY]', args);
        const { currency, value, device } = args;
        const { name } = device;
        await ctx.homey.app.action_SET_CURRENCY(name, value, currency);
    })
    .registerArgumentAutocompleteListener('device', async (query, args) => {
        const variables = ctx.appSettings.VARIABLES.map((c) => ({ name: c }));
        return variables.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
    });

    this.setUpdateListeners(ctx);
};

exports.setUpdateListeners = async function (ctx) {
    const action_START = ctx.homey.flow.getActionCard('action_START');
    action_START.on('update', () => {
        action_START.getArgumentValues().then(async (values) => {
            ctx.log('[onUpdate] action_START - ', values);
            const [args] = values;
            await ctx.action_START(args.name);
        });
    });
};
