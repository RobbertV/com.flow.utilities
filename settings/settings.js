let settingsStore = {};
function onHomeyReady(Homey) {
    const _settingsKey = `com.flow.utilities.settings`;

    Homey.get(_settingsKey, initializeSettings);
    Homey.on('settings.set', (key, data) => {
        if (key == _settingsKey) {
            // remove all listneres on update.
            const save = document.getElementById('save');
            const clear = document.getElementById('clear');
            const input = document.getElementById('set_variable');

            save.replaceWith(save.cloneNode(true));
            clear.replaceWith(clear.cloneNode(true));
            input.replaceWith(input.cloneNode(true));

            Homey.get(_settingsKey, initializeSettings);
        }
    });

    Homey.ready();
}

function initializeSettings(err, data) {
    if (err || !data) {
        document.getElementById('error').innerHTML = err;
        return;
    }

    document.getElementById('variables_overview').innerHTML = variableMapper(data['VARIABLES']);

    window.VARIABLES = data['VARIABLES'];
    settingsStore = data;

    init();
    initClear();

    document.getElementById('set_variable').addEventListener('keyup', function (event) {
        if (event.keyCode === 13) {
            event.preventDefault();
            document.getElementById('save').click();
        }
    });
}

function variableMapper(variables) {
    let html = '';
    variables
        .sort((a, b) => a.localeCompare(b))
        .forEach((f) => {
            html += `<div id="row-${f}" class="row"><label>${f}</label><button onClick="remove(\`` + f + `\`)">X</button></div>`;
        });

    return html;
}

function remove(name) {
    const clearSingle = Homey.confirm(Homey.__('settings.delete-confirm-single', { var: name }));
    clearSingle.then((confirmResult) => {
        if (confirmResult) {
            const variables = window.VARIABLES.filter((f) => f !== name);

            const settings = {
                ...settingsStore,
                VARIABLES: [...new Set(variables)]
            };

            saveSettings(settings, { successMessage: Homey.__('settings.removed') });
        }
    });
}

function init() {
    document.getElementById('save').addEventListener('click', function (e) {
        const input = document.getElementById('set_variable');
        const existingVariables = window.VARIABLES;
        let variables = [...existingVariables];
        let newVariable = document.getElementById('set_variable').value.trim();

        if (newVariable === '') {
            setNotification({ inputErrorMessage: Homey.__('settings.errors.empty') });
            return;
        }

        if (newVariable) {
            newVariable = capitalize(newVariable);
            if (variables.includes(newVariable)) {
                setNotification({ inputErrorMessage: Homey.__('settings.errors.duplicate') });
                return;
            }

            variables = [...existingVariables, newVariable];
        }

        const settings = {
            ...settingsStore,
            VARIABLES: [...new Set(variables)]
        };

        saveSettings(settings, { successMessage: Homey.__('settings.saved') });
    });
}

function initClear() {
    document.getElementById('clear').addEventListener('click', function (e) {
        const clearAll = Homey.confirm(Homey.__('settings.delete-confirm'));
        clearAll.then((confirmResult) => {
            if (confirmResult) {
                document.getElementById('variables_overview').innerHTML = '';
                document.getElementById('set_variable').value = '';

                const settings = {
                    COMPARISONS: [],
                    TOTALS: [],
                    VARIABLES: [],
                    ZONES: {}
                };

                saveSettings(settings, { successMessage: Homey.__('settings.cleared') });
            }
        });
    });
}

function saveSettings(settings, notification) {
    setNotification({ loadingMessage: `<i class="fa fa-spinner fa-spin fa-fw"></i>${Homey.__('settings.loading')}` });

    Homey.api('PUT', '/settings', settings, function (err, result) {
        if (err) {
            setNotification({ errorMessage: err });
            return Homey.alert(err);
        } else {
            setNotification(notification);

            document.getElementById('set_variable').value = '';
        }
    });
}

function capitalize(value) {
    return value.toLowerCase().charAt(0).toUpperCase() + value.slice(1);
}

function setNotification({ inputErrorMessage = '', errorMessage = '', loadingMessage = '', successMessage = '' } = {}) {
    inputError = document.getElementById('inputError');
    error = document.getElementById('error');
    loading = document.getElementById('loading');
    success = document.getElementById('success');

    inputError.innerHTML = inputErrorMessage;
    error.innerHTML = errorMessage;
    loading.innerHTML = loadingMessage;
    success.innerHTML = successMessage;
}
