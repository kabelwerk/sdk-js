import {
    Button,
    DataConnectionIcon,
    Heading,
    Pane,
    TextInputField
} from 'evergreen-ui';
import React from 'react';
import { formatText } from './utils/string';

const validateLogin = (config) => {
    const { url, token } = config;

    const validateUrl = (url) => {
        if (url.length === 0) {
            return 'URL cannot be empty.';
        }

        if (/^(ws|wss):\/\/[^ "]+$/.test(url) === false) {
            return 'Not a valid URL.';
        }

        return '';
    };

    const validateToken = (token) => {
        if (token.length === 0) {
            return 'Token cannot be empty.';
        }

        return '';
    };

    return {
        urlValidationMessage: validateUrl(url),
        tokenValidationMessage: validateToken(token),
        areAllFormFieldsValid:
            validateUrl(url).length === 0 && validateToken(token).length === 0,
    };
};

const Login = function ({ config, updateConfig }) {
    const [url, setUrl] = React.useState(config.url);
    const [token, setToken] = React.useState(config.token);
    const [name, setName] = React.useState(config.name);
    const [formErrors, setFormErrors] = React.useState({
        urlValidationMessage: '',
        tokenValidationMessage: '',
        areAllFormFieldsValid: false,
    });

    return (
        <Pane
            display="flex"
            justifyContent="center"
            alignItems="center"
            height="100vh"
        >
            <Pane padding={32} elevation={4} borderRadius={20} width={400}>
                <Pane>
                    <Heading size={800} marginBottom={32}>
                        Connect
                    </Heading>
                </Pane>
                <Pane marginTop={16}>
                    <TextInputField
                        label="URL"
                        placeholder="URL"
                        isInvalid={formErrors.urlValidationMessage.length > 0}
                        onChange={(e) => setUrl(formatText(e.target.value))}
                        validationMessage={
                            formErrors.urlValidationMessage.length === 0
                                ? undefined
                                : formErrors.urlValidationMessage
                        }
                        onBlur={() =>
                            setFormErrors(validateLogin({ url, token }))
                        }
                        onFocus={() =>
                            setFormErrors({
                                urlValidationMessage: '',
                                tokenValidationMessage:
                                    formErrors.tokenValidationMessage,
                            })
                        }
                        value={url}
                        type="url"
                        required
                    />
                </Pane>
                <Pane marginTop={16}>
                    <TextInputField
                        label="Token"
                        placeholder="Token"
                        isInvalid={formErrors.tokenValidationMessage.length > 0}
                        onChange={(e) => setToken(formatText(e.target.value))}
                        validationMessage={
                            formErrors.tokenValidationMessage.length === 0
                                ? undefined
                                : formErrors.tokenValidationMessage
                        }
                        onBlur={() =>
                            setFormErrors(validateLogin({ url, token }))
                        }
                        onFocus={() =>
                            setFormErrors({
                                urlValidationMessage:
                                    formErrors.urlValidationMessage,
                                tokenValidationMessage: '',
                            })
                        }
                        required
                    />
                </Pane>
                <Pane marginTop={16}>
                    <TextInputField
                        label="Name"
                        description="The displayed name in the chat"
                        placeholder="Name"
                        onChange={(e) => setName(formatText(e.target.value))}
                        value={name}
                    />
                </Pane>
                <Pane display="flex" justifyContent="flex-end" marginTop={32}>
                    <Button
                        appearance="primary"
                        size="large"
                        iconBefore={DataConnectionIcon}
                        onClick={(e) => {
                            e.preventDefault();
                            updateConfig({ url, token, name });
                        }}
                        disabled={!formErrors.areAllFormFieldsValid}
                    >
                        Connect
                    </Button>
                </Pane>
            </Pane>
        </Pane>
    );
};

export { Login };
