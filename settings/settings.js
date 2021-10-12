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

    initSave(data);
    initClear(data);

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
    window.VARIABLES = window.VARIABLES.filter((f) => f !== name);
    document.getElementById('save').click();
}

function initSave(_settings) {
    document.getElementById('save').addEventListener('click', function (e) {
        const error = document.getElementById('error');
        const loading = document.getElementById('loading');
        const success = document.getElementById('success');

        const existingVariables = window.VARIABLES;
        let variables = [...existingVariables];
        let newVariable = document.getElementById('set_variable').value;

        if (newVariable) {
            newVariable = capitalize(newVariable);
            variables = [...existingVariables, newVariable];
        }

        const settings = {
            ..._settings,
            VARIABLES: [...new Set(variables)]
        };

        // ----------------------------------------------

        loading.innerHTML = '<i class="fa fa-spinner fa-spin fa-fw"></i>Saving...';
        error.innerHTML = '';
        success.innerHTML = '';

        Homey.api('PUT', '/settings', settings, function (err, result) {
            if (err) {
                error.innerHTML = err;
                loading.innerHTML = '';
                success.innerHTML = '';
                return Homey.alert(err);
            } else {
                loading.innerHTML = '';
                error.innerHTML = '';
                success.innerHTML = 'Saved.';

                document.getElementById('set_variable').value = '';
            }
        });
    });
}

function initClear(_settings) {
    document.getElementById('clear').addEventListener('click', function (e) {
        error = document.getElementById('error');
        loading = document.getElementById('loading');
        success = document.getElementById('success');

        document.getElementById('variables_overview').innerHTML = '';
        document.getElementById('set_variable').value = '';

        const settings = {
            COMPARISONS: [],
            TOTALS: [],
            VARIABLES: []
        };

        Homey.api('PUT', '/settings', settings, function (err, result) {
            if (err) {
                error.innerHTML = err;
                loading.innerHTML = '';
                success.innerHTML = '';
                return Homey.alert(err);
            } else {
                loading.innerHTML = '';
                error.innerHTML = '';
                success.innerHTML = 'Cleared & Saved.';
            }
        });
    });
}

function capitalize(value) {
    return value.toLowerCase().charAt(0).toUpperCase() + value.slice(1);
}
