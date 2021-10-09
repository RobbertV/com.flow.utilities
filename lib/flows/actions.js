exports.init = async function (ctx) {
    const action_START = ctx.homey.flow.getActionCard('action_START');
    action_START
        .registerRunListener(async (args) => {
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
    action_END
        .registerRunListener(async (args) => {
            ctx.homey.app.log('[action_END]', args);

            const { device, value } = args;
            const { name } = device;

            await ctx.homey.app.action_END(name, value);
        })
        .registerArgumentAutocompleteListener('device', async (query, args) => {
            const variables = ctx.appSettings.VARIABLES.map((c) => ({ name: c }));
            return variables.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
        });

    const action_START_DURATION = ctx.homey.flow.getActionCard('action_START_DURATION');
    action_START_DURATION
        .registerRunListener(async (args) => {
            ctx.homey.app.log('[action_START_DURATION]', args);

            const { variable } = args;
            const { name } = variable;

            await ctx.homey.app.action_START(name, true);
        })
        .registerArgumentAutocompleteListener('variable', async (query, args) => {
            const variables = ctx.appSettings.VARIABLES.map((c) => ({ name: c }));
            return variables.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
        });

    const action_END_DURATION = ctx.homey.flow.getActionCard('action_END_DURATION');
    action_END_DURATION
        .registerRunListener(async (args) => {
            ctx.homey.app.log('[action_END_DURATION]', args);

            const { variable } = args;
            const { name } = variable;

            await ctx.homey.app.action_END(name);
        })
        .registerArgumentAutocompleteListener('variable', async (query, args) => {
            const variables = ctx.appSettings.VARIABLES.map((c) => ({ name: c }));
            return variables.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
        });

    const action_START_COMPARE = ctx.homey.flow.getActionCard('action_START_COMPARE');
    action_START_COMPARE
        .registerRunListener(async (args) => {
            ctx.homey.app.log('[action_START_COMPARE]', args);

            const { variable, value } = args;
            const { name } = variable;

            await ctx.homey.app.action_START({ name: name, comparison: value });
        })
        .registerArgumentAutocompleteListener('variable', async (query, args) => {
            const variables = ctx.appSettings.VARIABLES.map((c) => ({ name: c }));
            return variables.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
        });

    const action_END_COMPARE = ctx.homey.flow.getActionCard('action_END_COMPARE');
    action_END_COMPARE
        .registerRunListener(async (args) => {
            ctx.homey.app.log('[action_END_COMPARE]', args);

            const { variable, value } = args;
            const { name } = variable;

            await ctx.homey.app.action_END(name, value);
        })
        .registerArgumentAutocompleteListener('variable', async (query, args) => {
            const variables = ctx.appSettings.VARIABLES.map((c) => ({ name: c }));
            return variables.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
        });

    const action_SET_CURRENCY = ctx.homey.flow.getActionCard('action_SET_CURRENCY');
    action_SET_CURRENCY
        .registerRunListener(async (args) => {
            ctx.homey.app.log('[action_SET_CURRENCY]', args);
            const { currency, value, variable } = args;
            const { name } = variable;
            await ctx.homey.app.action_SET_CURRENCY(name, value, currency);
        })
        .registerArgumentAutocompleteListener('variable', async (query, args) => {
            const variables = ctx.appSettings.VARIABLES.map((c) => ({ name: c }));
            return variables.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
        });
};
