exports.init = async function (homey) {
    const action_START_DATE = homey.flow.getActionCard("action_START_DATE");
    action_START_DATE.registerRunListener(async (args) => {
        homey.app.log("[action_START_DATE]", args);
        const { name } = args;
        await homey.app.action_START_DATE(name);
    });

    const action_END_DATE = homey.flow.getActionCard("action_END_DATE");
    action_END_DATE.registerRunListener(async (args) => {
        homey.app.log("[action_END_DATE]", args);
        const { name } = args;
        await homey.app.action_END_DATE(name);
    });
};
