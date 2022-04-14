import {
    Button,
    Heading,
    OfflineIcon,
    Pane,
    TextInputField,
} from 'evergreen-ui';
import React from 'react';
import { formatText } from './utils/string';

// return an error message if the given value is not a valid URL
const validateUrl = function (url) {
    if (url.length === 0) {
        return 'URL cannot be empty.';
    }

    if (!/^(ws|wss):\/\/[^ "]+$/.test(url)) {
        return 'Not a valid WebSocket URL.';
    }

    return '';
};

// return an error message if the given value does not look like a valid token
const validateToken = function (token) {
    if (token.length === 0) {
        return 'Token cannot be empty.';
    }

    return '';
};

const Login = function ({ config, updateConfig }) {
    // the form field values
    const [url, setUrl] = React.useState(config.url);
    const [token, setToken] = React.useState(config.token);
    const [name, setName] = React.useState(config.name);

    // the form field errors
    const [urlError, setUrlError] = React.useState('');
    const [tokenError, setTokenError] = React.useState('');

    // handle change events for the URL input
    const handleUrlChange = function (e) {
        const value = formatText(e.target.value);

        setUrl(value);
        setUrlError(validateUrl(value));
    };

    // handle change events for the token input
    const handleTokenChange = function (e) {
        const value = formatText(e.target.value);

        setToken(value);
        setTokenError(validateToken(value));
    };

    // handle change events for the name input
    const handleNameChange = function (e) {
        setName(formatText(e.target.value));
    };

    // handle form submit events
    const handleSubmit = function (e) {
        e.preventDefault();
        updateConfig({ url, token, name });
    };

    return (
        <Pane
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="100vh"
        >
            <form onSubmit={handleSubmit}>
                <Pane padding={32} elevation={4} borderRadius={20} width={400}>
                    <Pane>
                        <Heading size={800} marginBottom={32}>
                            Connect
                        </Heading>
                    </Pane>
                    <Pane marginTop={16}>
                        <TextInputField
                            value={url}
                            required
                            label="URL"
                            placeholder="URL"
                            onChange={handleUrlChange}
                            isInvalid={!!urlError}
                            validationMessage={urlError ? urlError : undefined}
                        />
                    </Pane>
                    <Pane marginTop={16}>
                        <TextInputField
                            required
                            label="Token"
                            placeholder="Token"
                            onChange={handleTokenChange}
                            isInvalid={!!tokenError}
                            validationMessage={
                                tokenError ? tokenError : undefined
                            }
                        />
                    </Pane>
                    <Pane marginTop={16}>
                        <TextInputField
                            value={name}
                            label="Name"
                            description="The displayed name in the chat"
                            placeholder="Name"
                            onChange={handleNameChange}
                        />
                    </Pane>
                    <Pane
                        display="flex"
                        justifyContent="flex-end"
                        marginTop={32}
                    >
                        <Button
                            type="submit"
                            appearance="primary"
                            size="large"
                            iconBefore={OfflineIcon}
                            disabled={
                                !url || !!urlError || !!tokenError || !token
                            }
                        >
                            Connect
                        </Button>
                    </Pane>
                </Pane>
            </form>
        </Pane>
    );
};

export { Login };
