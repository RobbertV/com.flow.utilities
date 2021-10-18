const { variableAutoComplete } = require('../helpers');

exports.init = async function (ctx) {
    ctx.homey.app.trigger_COMPARISON = ctx.homey.flow
        .getTriggerCard(`trigger_COMPARISON`)
        .registerArgumentAutocompleteListener('variable', async (query) => variableAutoComplete(ctx, query, true))
        .registerRunListener(async (args, state) => args.variable.name === ctx.homey.__('helpers.all') || args.variable.name === state.token);
};
