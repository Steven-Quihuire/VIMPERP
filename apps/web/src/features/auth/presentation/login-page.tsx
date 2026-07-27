import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useLogin } from './use-auth';

export const LoginPage = ({ apiBaseUrl }: { apiBaseUrl?: string }) => {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const login = useLogin(apiBaseUrl);

  return (
    <main>
      <h1>Sign in</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void login
            .mutateAsync({ identifier, password })
            .then(() => navigate('/dashboard'));
        }}
      >
        <label>
          <span>Email or username</span>
          <input
            name="identifier"
            value={identifier}
            onChange={(event) => setIdentifier(event.target.value)}
          />
        </label>
        <label>
          <span>Password</span>
          <input
            name="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {login.isError ? <p>Invalid credentials</p> : null}
        <button type="submit">Sign in</button>
      </form>
    </main>
  );
};
