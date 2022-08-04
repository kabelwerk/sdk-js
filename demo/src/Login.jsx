import {
  Alert,
  Button,
  Heading,
  OfflineIcon,
  Pane,
  TextInputField,
} from 'evergreen-ui';
import React from 'react';

import { generateUser } from './backend.js';

const Login = function ({ updateToken }) {
  // the form field values
  const [name, setName] = React.useState('anonymous');

  // the form error message, if such
  const [errorMessage, setErrorMessage] = React.useState('');

  // handle form submit events
  const handleSubmit = function (e) {
    e.preventDefault();

    generateUser(name.trim())
      .then(({ token }) => updateToken(token))
      .catch((error) => setErrorMessage(error.message));
  };

  return (
    <Pane
      display="flex"
      alignItems="center"
      justifyContent="center"
      height="100vh"
    >
      <form onSubmit={handleSubmit}>
        <Pane padding={32} elevation={4} borderRadius={20} width={400}>
          <Heading size={800} marginBottom={32}>
            Kabelwerk Demo
          </Heading>
          {errorMessage && (
            <Alert
              intent="danger"
              title="Error generating a demo user"
              marginBottom={32}
            >
              {errorMessage}
            </Alert>
          )}
          <Pane>
            <TextInputField
              label="User name"
              description="The name displayed in the chat"
              placeholder="Name"
              value={name}
              required
              onChange={(e) => setName(e.target.value)}
            />
          </Pane>
          <Pane display="flex" justifyContent="flex-end" marginTop={32}>
            <Button
              type="submit"
              appearance="primary"
              size="large"
              iconBefore={OfflineIcon}
              disabled={!name}
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
