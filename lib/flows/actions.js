const { variableAutoComplete, convertNumber } = require('../helpers');

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

    const action_CONVERT_TEXT = ctx.homey.flow.getActionCard('action_CONVERT_TEXT');
    action_CONVERT_TEXT
        .registerRunListener(async (args) => {
            ctx.homey.app.log('[action_CONVERT_TEXT]', args);
            const { type, text, variable } = args;
            const { name } = variable;
            await ctx.homey.app.action_CONVERT_TEXT(name, type, text);
        })
        .registerArgumentAutocompleteListener('variable', async (query) => variableAutoComplete(ctx, query));

    const action_REPLACE_STRING = ctx.homey.flow.getActionCard('action_REPLACE_STRING');
    action_REPLACE_STRING
        .registerRunListener(async (args) => {
            ctx.homey.app.log('[action_REPLACE_STRING]', args);
            const { stringContains, replacementString, inputString, variable } = args;
            const { name } = variable;
            await ctx.homey.app.action_REPLACE_STRING(name, stringContains, replacementString, inputString);
        })
        .registerArgumentAutocompleteListener('variable', async (query) => variableAutoComplete(ctx, query));

    const action_CREATE_BOOLEAN_TAG = ctx.homey.flow.getActionCard('action_CREATE_BOOLEAN_TAG');
    action_CREATE_BOOLEAN_TAG.registerRunListener(async (args) => {
        ctx.homey.app.log('[action_CREATE_BOOLEAN_TAG]', args);
        const { booleanInput } = args;
        return {
            booleanVal: booleanInput === 'yes' ? true : false
        };
    });

    const action_CREATE_NUMBER_TAG = ctx.homey.flow.getActionCard('action_CREATE_NUMBER_TAG');
    action_CREATE_NUMBER_TAG.registerRunListener(async (args) => {
        ctx.homey.app.log('[action_CREATE_NUMBER_TAG]', args);
        const { numberInput, decimals } = args;
        return {
            numberVal: decimals ? convertNumber(numberInput, decimals) : numberInput
        };
    });

    const action_CREATE_NUMCURR_TAG = ctx.homey.flow.getActionCard('action_CREATE_NUM-CURR_TAG');
    action_CREATE_NUMCURR_TAG.registerRunListener(async (args) => {
        ctx.homey.app.log('[action_CREATE_NUM-CURR_TAG]', args);
        const { numberInput, currency } = args;
        const setLocalCurrency = numberInput.toLocaleString(ctx.homey.__('helpers.locale'), { style: 'currency', currency: currency });
        return {
            currencyOutcome: setLocalCurrency
        };
    });
};
