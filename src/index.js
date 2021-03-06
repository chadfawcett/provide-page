import thunk from 'redux-thunk';
import { canUseDOM } from 'exenv';

export Link from './components/Link';
export Form from './components/Form';

export createMiddleware from './createMiddleware';
export defaultRenderDocumentToString from './defaultRenderDocumentToString';

export const SET_HEADERS = 'SET_HEADERS';
export const SET_STATUS_CODE = 'SET_STATUS_CODE';
export const SET_DOCUMENT_TITLE = 'SET_DOCUMENT_TITLE';
export const SET_META_DESCRIPTION = 'SET_META_DESCRIPTION';
export const SET_META_ROBOTS = 'SET_META_ROBOTS';
export const SET_ICON_FILE = 'SET_ICON_FILE';
export const SET_CSS_FILES = 'SET_CSS_FILES';
export const SET_JS_FILES = 'SET_JS_FILES';
export const SET_REQUEST_ERROR = 'SET_REQUEST_ERROR';
export const SYNC_WITH_ROUTER = 'SYNC_WITH_ROUTER';
export const GET_PAGE_STATES = 'GET_PAGE_STATES';
export const GOT_PAGE_STATES = 'GOT_PAGE_STATES';
export const SUBMIT_REQUEST = 'SUBMIT_REQUEST';
export const SUBMIT_FORM = 'SUBMIT_FORM';
export const SUBMITTED_FORM = 'SUBMITTED_FORM';
export const PENDING_PAGE = 'PENDING_PAGE';
export const PENDING_FORM = 'PENDING_FORM';
export const UPDATE_SESSION = 'UPDATE_SESSION';
export const DESTROY_SESSION = 'DESTROY_SESSION';
export const NOOP = 'NOOP';

function getUrl(location) {
  return location ? location.pathname + location.search : null;
}

function clearPending(dispatch, getState) {
  const state = getState();

  if (state.pendingForms.length) {
    const { formData, onSubmit } = state.pendingForms.shift();

    dispatch(actions.submitForm(formData, onSubmit));
  } else if (state.pendingPage) {
    dispatch(actions.getPageStates(typeof window === 'undefined'
      ? state.routerLocation
      : window.location
    ));
  }
}

const _noEffect = true;

const batchAction = (action, immediate) => {
  if (immediate) {
    return action;
  }

  return (dispatch, getState) => {
    const { type } = action;
    const { pageBatchedActions } = getState();
    const timeout = setTimeout(() => {
      while (pageBatchedActions[type].count) {
        pageBatchedActions[type].count--;
        dispatch({ type: NOOP, _noEffect });
      }

      delete pageBatchedActions[type];
      dispatch(action);
    });

    if (pageBatchedActions[type]) {
      clearTimeout(pageBatchedActions[type].timeout);
      pageBatchedActions[type].timeout = timeout;
      pageBatchedActions[type].count++;
    } else {
      pageBatchedActions[type] = { timeout, count: 0 };
    }
  };
};

const actions = {
  setHeaders(headers, immediate) {
    return batchAction(
      { type: SET_HEADERS, headers, _noEffect }, immediate
    );
  },

  setStatusCode(statusCode, immediate) {
    return batchAction(
      { type: SET_STATUS_CODE, statusCode, _noEffect }, immediate
    );
  },

  setDocumentTitle(documentTitle = '', immediate) {
    return batchAction(
      { type: SET_DOCUMENT_TITLE, documentTitle, _noEffect }, immediate
    );
  },

  setMetaDescription(metaDescription = '', immediate) {
    return batchAction(
      { type: SET_META_DESCRIPTION, metaDescription, _noEffect }, immediate
    );
  },

  setMetaRobots(metaRobots = '', immediate) {
    return batchAction(
      { type: SET_META_ROBOTS, metaRobots, _noEffect }, immediate
    );
  },

  setIconFile(iconFile = '', immediate) {
    return batchAction(
      { type: SET_ICON_FILE, iconFile, _noEffect }, immediate
    );
  },

  setCssFiles(cssFiles = [], immediate) {
    return batchAction(
      { type: SET_CSS_FILES, cssFiles, _noEffect }, immediate
    );
  },

  setJsFiles(jsFiles = [], immediate) {
    return batchAction(
      { type: SET_JS_FILES, jsFiles, _noEffect }, immediate
    );
  },

  setRequestError(requestError, immediate) {
    return batchAction(
      { type: SET_REQUEST_ERROR, requestError }, immediate
    );
  },

  syncWithRouter(routerHistory, routerLocation) {
    return (dispatch, getState) => {
      dispatch({
        type: SYNC_WITH_ROUTER, routerHistory, routerLocation, _noEffect
      });

      routerHistory.listen(nextRouterLocation => {
        dispatch(actions.getPageStates(nextRouterLocation));
      });
    };
  },

  getPageStates(routerLocation) {
    return (dispatch, getState, { setStates }) => {
      const { ssrDisabled, waitingForResponse, routerHistory } = getState();

      if (ssrDisabled === true || typeof XMLHttpRequest === 'undefined') {
        dispatch({ type: NOOP, _noEffect });
        return;
      }

      if (waitingForResponse) {
        dispatch({ type: PENDING_PAGE, routerLocation, _noEffect });
        return;
      }

      const xhr = new XMLHttpRequest();
      const headers = {
        'content-type': 'application/json;charset=UTF-8',
        'accept': 'application/json'
      };

      dispatch({ type: GET_PAGE_STATES, routerLocation, _noEffect });

      xhr.open('GET', getUrl(routerLocation), true);

      for (let header in headers) {
        xhr.setRequestHeader(header, headers[header]);
      }

      xhr.onload = () => {
        const states = JSON.parse(xhr.response);

        setStates(states);
        dispatch({ type: GOT_PAGE_STATES, states });
        clearPending(dispatch, getState);
      };

      xhr.send();
    };
  },

  submitRequest({
    requestMethod = 'POST',
    requestBody = {},
    requestHeaders = {},
    requestSession,
    acceptJson
  }) {
    return {
      type: SUBMIT_REQUEST,
      requestMethod,
      requestBody,
      requestHeaders,
      requestSession,
      acceptJson
    };
  },

  submitForm(formData, onSubmit) {
    return (dispatch, getState, { setStates }) => {
      const { ssrDisabled, waitingForResponse, routerLocation } = getState();

      if (ssrDisabled === true || typeof XMLHttpRequest === 'undefined') {
        formData._formHandled = true;

        if (onSubmit) {
          onSubmit(null, formData);
        }

        dispatch({ type: NOOP, _noEffect });
        return;
      }

      if (waitingForResponse) {
        dispatch({ type: PENDING_FORM, formData, onSubmit, _noEffect });
        return;
      }

      const xhr = new XMLHttpRequest();
      const headers = {
        'content-type': 'application/json;charset=UTF-8',
        'accept': 'application/json'
      };

      if (onSubmit) {
        headers['x-server-side'] = true;
      }

      dispatch({ type: SUBMIT_FORM, formData, onSubmit });

      xhr.open('POST', getUrl(routerLocation), true);

      for (let header in headers) {
        xhr.setRequestHeader(header, headers[header]);
      }

      xhr.onload = () => {
        const states = JSON.parse(xhr.response);

        formData._formHandled = true;

        setStates(states);

        if (onSubmit) {
          onSubmit(null, formData);
        }

        dispatch({ type: SUBMITTED_FORM, formData, onSubmit, states });
        clearPending(dispatch, getState);
      };

      xhr.send(JSON.stringify(formData));
    };
  },

  updateSession(updates, immediate) {
    return batchAction(
      { type: UPDATE_SESSION, updates }, immediate
    );
  },

  destroySession(immediate) {
    return batchAction(
      { type: DESTROY_SESSION }, immediate
    );
  }
};

const reducers = {
  headers(state = null, action) {
    switch (action.type) {
      case SET_HEADERS:
        return action.headers;

      default:
        return state;
    }
  },

  statusCode(state = null, action) {
    switch (action.type) {
      case SET_STATUS_CODE:
        return action.statusCode;

      default:
        return state;
    }
  },

  documentTitle(state = canUseDOM && document.title, action) {
    switch (action.type) {
      case SET_DOCUMENT_TITLE:
        if (canUseDOM) {
          document.title = action.documentTitle;
        }
        return action.documentTitle;

      default:
        return state;
    }
  },

  metaDescription(state = 'Built with provide-page.', action) {
    switch (action.type) {
      case SET_META_DESCRIPTION:
        return action.metaDescription;

      default:
        return state;
    }
  },

  metaRobots(state = 'index,follow', action) {
    switch (action.type) {
      case SET_META_ROBOTS:
        return action.metaRobots;

      default:
        return state;
    }
  },

  iconFile(state = '/static/favicon.ico', action) {
    switch (action.type) {
      case SET_ICON_FILE:
        return action.iconFile;

      default:
        return state;
    }
  },

  cssFiles(state = [], action) {
    switch (action.type) {
      case SET_CSS_FILES:
        return action.cssFiles;

      default:
        return state;
    }
  },

  jsFiles(state = [], action) {
    switch (action.type) {
      case SET_JS_FILES:
        return action.jsFiles;

      default:
        return state;
    }
  },

  requestError(state = '', action) {
    switch (action.type) {
      case SET_REQUEST_ERROR:
        return action.requestError;

      default:
        return state;
    }
  },

  requestSession(state = {}, action) {
    if (!state.__actualSession && typeof state.destroy !== 'undefined') {
      state = { ...state, __actualSession: state };
    }

    switch (action.type) {
      case SUBMIT_REQUEST:
        const { requestSession } = action;

        return requestSession
          ? { ...requestSession, __actualSession: requestSession }
          : state;

      case UPDATE_SESSION:
        const nextState = { ...state };
        const { updates = {} } = action;

        delete updates.__actualSession; // just in case
        if (!nextState.__actualSession) {
          nextState.__actualSession = {};
        }

        for (let key in updates) {
          nextState[key] = updates[key];
          nextState.__actualSession[key] = updates[key];
        }

        if (nextState.__actualSession.save) {
          nextState.__actualSession.save();
        }

        return nextState;

      case DESTROY_SESSION:
        if (state.__actualSession && state.__actualSession.destroy) {
          state.__actualSession.destroy();
          return { __actualSession: state.__actualSession };
        }

        return { __actualSession: {} };

      default:
        return state;
    }
  },

  requestMethod(state = null, action) {
    switch (action.type) {
      case SUBMIT_REQUEST:
        return action.requestMethod;

      default:
        return state;
    }
  },

  requestBody(state = null, action) {
    switch (action.type) {
      case SUBMIT_FORM:
        return action.formData;

      case SUBMIT_REQUEST:
        return action.requestBody;

      default:
        return state;
    }
  },

  requestHeaders(state = {}, action) {
    switch (action.type) {
      case SUBMIT_FORM:
      case SUBMIT_REQUEST:
        return action.requestHeaders || {};

      default:
        return state;
    }
  },

  acceptJson(state = null, action) {
    switch (action.type) {
      case SUBMIT_REQUEST:
        return typeof action.acceptJson === 'undefined'
          ? state
          : action.acceptJson;

      default:
        return state;
    }
  },

  routerHistory(state = null, action) {
    switch (action.type) {
      case SYNC_WITH_ROUTER:
        return action.routerHistory;

      default:
        return state;
    }
  },

  routerLocation(state = null, action) {
    switch (action.type) {
      case SYNC_WITH_ROUTER:
      case GET_PAGE_STATES:
        return action.routerLocation;

      default:
        return state;
    }
  },

  waitingForResponse(state = false, action) {
    switch (action.type) {
      case GET_PAGE_STATES:
      case SUBMIT_FORM:
        return true;

      case GOT_PAGE_STATES:
      case SUBMITTED_FORM:
        return false;

      default:
        return state;
    }
  },

  pendingPage(state = false, action) {
    switch (action.type) {
      case PENDING_PAGE:
        return true;

      case GET_PAGE_STATES:
      case SUBMIT_FORM:
        return false;

      default:
        return state;
    }
  },

  pendingForms(state = [], { type, formData, onSubmit }) {
    if (type === PENDING_FORM) {
      state.push({ formData, onSubmit });
    }

    return state;
  },

  pageBatchedActions: (state = {}) => state,

  ssrDisabled: (state = false) => state,
};

const merge = {
  formData: {
    keys: ['requestBody'],
    get({ requestBody }, { formId }) {
      return requestBody && requestBody._formId === formId
        ? requestBody
        : null;
    }
  }
};

const middleware = thunk;

const clientStateKeys = ['requestSession', 'requestError'];

const subscribeTo = {
  router({ store: routerStore }, { store: pageStore }) {
    // there's probably a better way to do this but whatever
    const { routerHistory } = pageStore.getState();

    if (typeof window !== 'undefined' && !routerHistory) {
      const { history, routing } = routerStore.getState();
      const location = routing && routing.locationBeforeTransitions
        || routing && routing.location
        || routerStore.getState().location
        || history.location;

      if (history && location) {
        pageStore.dispatch(actions.syncWithRouter(history, location));
      }
    }
  }
};

export default {
  actions, reducers, merge, middleware, clientStateKeys, subscribeTo
};
