const { formatToken } = require('../helpers');

exports.init = async function (ctx) {
    const condition_COMPARISON = ctx.homey.flow.getConditionCard('condition_COMPARISON');
    condition_COMPARISON
        .registerRunListener(async (args) => {
            ctx.homey.app.log('[condition_COMPARISON]', args);

            const { variable } = args;
            const { name } = variable;
            // const token = formatToken(`${name}-${ctx.homey.__('helpers.comparison')}`);
            const result = await ctx.appSettings.TOTALS.filter((total) => total.token !== variable);
            ctx.homey.app.log(`[condition_COMPARISON_RESULT] - token: ${token} - result: ${result.length > 0} | `, result);
            return result.length > 0;
        })
        .registerArgumentAutocompleteListener('variable', async (query) => this.variableAutoComplete(ctx, query));
};
exports.variableAutoComplete = function (ctx, query) {
    const variables = ctx.appSettings.VARIABLES.map((c) => ({ name: c }));
    return variables.filter((c) => c.name.toLowerCase().includes(query.toLowerCase()));
};
