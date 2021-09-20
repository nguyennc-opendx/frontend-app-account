import React from 'react';
import ReactDOM from 'react-dom';
import { Provider } from 'react-redux';
import { Router } from 'react-router-dom';
import configureStore from 'redux-mock-store';
import {
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { createMemoryHistory } from 'history';

import * as auth from '@edx/frontend-platform/auth';
import { IntlProvider, injectIntl } from '@edx/frontend-platform/i18n';

// Modal creates a portal.  Overriding ReactDOM.createPortal allows portals to be tested in jest.
ReactDOM.createPortal = node => node;

import NameChange from '../NameChange'; // eslint-disable-line import/first

const mockDispatch = jest.fn();
jest.mock('react-redux', () => ({
  ...jest.requireActual('react-redux'),
  useDispatch: () => mockDispatch,
}));

jest.mock('@edx/frontend-platform/auth');
jest.mock('../../data/selectors', () => jest.fn().mockImplementation(() => ({ nameChangeSelector: () => ({}) })));

const history = createMemoryHistory();

const IntlNameChange = injectIntl(NameChange);

const mockStore = configureStore();

describe('NameChange', () => {
  let props = {};
  let store = {};

  const reduxWrapper = children => (
    <Router history={history}>
      <IntlProvider locale="en">
        <Provider store={store}>{children}</Provider>
      </IntlProvider>
    </Router>
  );

  beforeEach(() => {
    store = mockStore();
    props = {
      errors: {},
      formValues: { name: 'edx edx' },
      saveState: null,
      intl: {},
    };

    auth.getAuthenticatedHttpClient = jest.fn(() => ({
      patch: async () => ({
        data: { status: 200 },
        catch: () => {},
      }),
    }));
    auth.getAuthenticatedUser = jest.fn(() => ({ userId: 3, username: 'edx' }));
  });

  afterEach(() => jest.clearAllMocks());

  it('renders input after clicking continue', async () => {
    const getInput = () => screen.queryByPlaceholderText('Enter the name on your government ID');

    render(reduxWrapper(<IntlNameChange {...props} />));
    expect(getInput()).toBeNull();

    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);

    expect(getInput()).toBeTruthy();
  });

  it('dispatches action on submit', async () => {
    const dispatchData = {
      payload: {
        newName: 'edx edx',
        username: 'edx',
        verifiedName: 'Verified Name',
      },
      type: 'ACCOUNT_SETTINGS__REQUEST_NAME_CHANGE',
    };

    render(reduxWrapper(<IntlNameChange {...props} />));

    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);

    const input = screen.getByPlaceholderText('Enter the name on your government ID');
    fireEvent.change(input, { target: { value: 'Verified Name' } });

    const submitButton = screen.getByText('Continue');
    fireEvent.click(submitButton);
    expect(mockDispatch).toHaveBeenCalledWith(dispatchData);
  });

  it('does not dispatch action while pending', async () => {
    props.saveState = 'pending';

    render(reduxWrapper(<IntlNameChange {...props} />));

    const continueButton = screen.getByText('Continue');
    fireEvent.click(continueButton);

    const input = screen.getByPlaceholderText('Enter the name on your government ID');
    fireEvent.change(input, { target: { value: 'Verified Name' } });

    const submitButton = screen.getByText('Continue');
    fireEvent.click(submitButton);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('routes to IDV when name change request is successful', async () => {
    props.saveState = 'complete';

    render(reduxWrapper(<IntlNameChange {...props} />));
    expect(history.location.pathname).toEqual('/id-verification');
  });
});