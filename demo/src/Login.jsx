import React from 'react';

const Login = function ({ config, updateConfig }) {
    const [url, setUrl] = React.useState(config.url);
    const [token, setToken] = React.useState(config.token);
    const [name, setName] = React.useState(config.name);

    const onSubmit = (e) => {
        e.preventDefault();

        updateConfig({ url, token, name });
    };

    return (
        <form onSubmit={onSubmit}>
            <fieldset>
                <label htmlFor="url-input">URL</label>
                <input
                    name="url"
                    id="url-input"
                    type="url"
                    required
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                />
            </fieldset>

            <fieldset>
                <label htmlFor="token-input">Token</label>
                <input
                    name="token"
                    id="token-input"
                    type="text"
                    required
                    value={token}
                    onChange={(e) => setToken(e.target.value)}
                />
            </fieldset>

            <fieldset>
                <label htmlFor="name-input">Name (optional)</label>
                <input
                    name="name"
                    id="name-input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </fieldset>

            <button type="submit">Connect</button>
        </form>
    );
};

export { Login };
