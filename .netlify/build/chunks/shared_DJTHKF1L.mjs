import { parse, stringify } from 'devalue';
import { A as AstroError, a as ActionCalledFromServerError, R as REDIRECT_STATUS_CODES, b as ActionsReturnedInvalidDataError } from './astro/server_BmkgANPO.mjs';
import { appendForwardSlash as appendForwardSlash$1 } from '@astrojs/internal-helpers/path';

const ACTION_QUERY_PARAMS$1 = {
  actionName: "_action"};
const ACTION_RPC_ROUTE_PATTERN = "/_actions/[...path]";

const __vite_import_meta_env__ = {"ASSETS_PREFIX": undefined, "BASE_URL": "/", "DEV": false, "MODE": "production", "PROD": true, "SITE": undefined, "SSR": true};
const ACTION_QUERY_PARAMS = ACTION_QUERY_PARAMS$1;
const appendForwardSlash = appendForwardSlash$1;
const codeToStatusMap = {
  // Implemented from tRPC error code table
  // https://trpc.io/docs/server/error-handling#error-codes
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  TIMEOUT: 405,
  CONFLICT: 409,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  UNSUPPORTED_MEDIA_TYPE: 415,
  UNPROCESSABLE_CONTENT: 422,
  TOO_MANY_REQUESTS: 429,
  CLIENT_CLOSED_REQUEST: 499,
  INTERNAL_SERVER_ERROR: 500
};
const statusToCodeMap = Object.entries(codeToStatusMap).reduce(
  // reverse the key-value pairs
  (acc, [key, value]) => ({ ...acc, [value]: key }),
  {}
);
class ActionError extends Error {
  type = "AstroActionError";
  code = "INTERNAL_SERVER_ERROR";
  status = 500;
  constructor(params) {
    super(params.message);
    this.code = params.code;
    this.status = ActionError.codeToStatus(params.code);
    if (params.stack) {
      this.stack = params.stack;
    }
  }
  static codeToStatus(code) {
    return codeToStatusMap[code];
  }
  static statusToCode(status) {
    return statusToCodeMap[status] ?? "INTERNAL_SERVER_ERROR";
  }
  static fromJson(body) {
    if (isInputError(body)) {
      return new ActionInputError(body.issues);
    }
    if (isActionError(body)) {
      return new ActionError(body);
    }
    return new ActionError({
      code: "INTERNAL_SERVER_ERROR"
    });
  }
}
function isActionError(error) {
  return typeof error === "object" && error != null && "type" in error && error.type === "AstroActionError";
}
function isInputError(error) {
  return typeof error === "object" && error != null && "type" in error && error.type === "AstroActionInputError" && "issues" in error && Array.isArray(error.issues);
}
class ActionInputError extends ActionError {
  type = "AstroActionInputError";
  // We don't expose all ZodError properties.
  // Not all properties will serialize from server to client,
  // and we don't want to import the full ZodError object into the client.
  issues;
  fields;
  constructor(issues) {
    super({
      message: `Failed to validate: ${JSON.stringify(issues, null, 2)}`,
      code: "BAD_REQUEST"
    });
    this.issues = issues;
    this.fields = {};
    for (const issue of issues) {
      if (issue.path.length > 0) {
        const key = issue.path[0].toString();
        this.fields[key] ??= [];
        this.fields[key]?.push(issue.message);
      }
    }
  }
}
async function callSafely(handler) {
  try {
    const data = await handler();
    return { data, error: void 0 };
  } catch (e) {
    if (e instanceof ActionError) {
      return { data: void 0, error: e };
    }
    return {
      data: void 0,
      error: new ActionError({
        message: e instanceof Error ? e.message : "Unknown error",
        code: "INTERNAL_SERVER_ERROR"
      })
    };
  }
}
function getActionQueryString(name) {
  const searchParams = new URLSearchParams({ [ACTION_QUERY_PARAMS$1.actionName]: name });
  return `?${searchParams.toString()}`;
}
function serializeActionResult(res) {
  if (res.error) {
    if (Object.assign(__vite_import_meta_env__, { OS: process.env.OS })?.DEV) {
      actionResultErrorStack.set(res.error.stack);
    }
    let body2;
    if (res.error instanceof ActionInputError) {
      body2 = {
        type: res.error.type,
        issues: res.error.issues,
        fields: res.error.fields
      };
    } else {
      body2 = {
        ...res.error,
        message: res.error.message
      };
    }
    return {
      type: "error",
      status: res.error.status,
      contentType: "application/json",
      body: JSON.stringify(body2)
    };
  }
  if (res.data === void 0) {
    return {
      type: "empty",
      status: 204
    };
  }
  let body;
  try {
    body = stringify(res.data, {
      // Add support for URL objects
      URL: (value) => value instanceof URL && value.href
    });
  } catch (e) {
    let hint = ActionsReturnedInvalidDataError.hint;
    if (res.data instanceof Response) {
      hint = REDIRECT_STATUS_CODES.includes(res.data.status) ? "If you need to redirect when the action succeeds, trigger a redirect where the action is called. See the Actions guide for server and client redirect examples: https://docs.astro.build/en/guides/actions." : "If you need to return a Response object, try using a server endpoint instead. See https://docs.astro.build/en/guides/endpoints/#server-endpoints-api-routes";
    }
    throw new AstroError({
      ...ActionsReturnedInvalidDataError,
      message: ActionsReturnedInvalidDataError.message(String(e)),
      hint
    });
  }
  return {
    type: "data",
    status: 200,
    contentType: "application/json+devalue",
    body
  };
}
function deserializeActionResult(res) {
  if (res.type === "error") {
    let json;
    try {
      json = JSON.parse(res.body);
    } catch {
      return {
        data: void 0,
        error: new ActionError({
          message: res.body,
          code: "INTERNAL_SERVER_ERROR"
        })
      };
    }
    if (Object.assign(__vite_import_meta_env__, { OS: process.env.OS })?.PROD) {
      return { error: ActionError.fromJson(json), data: void 0 };
    } else {
      const error = ActionError.fromJson(json);
      error.stack = actionResultErrorStack.get();
      return {
        error,
        data: void 0
      };
    }
  }
  if (res.type === "empty") {
    return { data: void 0, error: void 0 };
  }
  return {
    data: parse(res.body, {
      URL: (href) => new URL(href)
    }),
    error: void 0
  };
}
const actionResultErrorStack = /* @__PURE__ */ function actionResultErrorStackFn() {
  let errorStack;
  return {
    set(stack) {
      errorStack = stack;
    },
    get() {
      return errorStack;
    }
  };
}();
function astroCalledServerError() {
  return new AstroError(ActionCalledFromServerError);
}

export { ActionError as A, astroCalledServerError as a, ACTION_QUERY_PARAMS as b, appendForwardSlash as c, deserializeActionResult as d, callSafely as e, ActionInputError as f, getActionQueryString as g, ACTION_RPC_ROUTE_PATTERN as h, isInputError as i, serializeActionResult as s };
