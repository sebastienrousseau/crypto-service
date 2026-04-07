/**
 * Copyright © 2022-2023 The Crypto Service Suite. All rights reserved.
 * SPDX-License-Identifier: Apache-2.0
 * SPDX-License-Identifier: MIT
 */

/**
 * Represents an Authorization Token.
 */
export type AuthorizationToken = {
  /** The key used for authorization. */
  key: string;
  /** The type of the authorization token. */
  type: string;
  /** The value of the authorization token. */
  value: string;
};

/**
 * Represents Authorization Information.
 */
export type AuthorizationInfo = {
  /** An array containing bearer authorization data. */
  bearer: AuthorizationToken[];
  /** The key used for authorization. */
  key: string;
  /** The type of authorization, e.g., "Bearer". */
  type: string;
  /** The value used for authorization. */
  value: string;
};

/**
 * Represents a JSON Document (Postman collection v2.x shape).
 */
export type JsonDocument = {
  /** Contains metadata about the document. */
  info: {
    /** A description of the document. */
    description: string;
    /** The name of the document. */
    name: string;
  };
  /**
   * The items inside the collection. Postman v2.x exports this as an
   * array of either folders (which themselves contain `item`) or
   * leaf request/method entries. The previous declaration (`string`)
   * was wrong and the runtime code already cast it to an array, which
   * the new test suite now catches.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  item: any[];
};

/**
 * Represents a Method Type.
 */
export type MethodType = {
  /** Optional request details. */
  request?: JsonRequest;
  /** The name of the method. */
  name: string;
  /** Optional array of response details. */
  response?: ResponseType[];
};

/**
 * Represents a JSON Request.
 */
export type JsonRequest = {
  /** An array of headers included in the request. */
  header: RequestHeader[];
  /** The key associated with the request. */
  key: string;
  /** The value associated with the request. */
  value: string;
  /** A description of the request. */
  description: string;
};

/**
 * Represents a Request Header.
 */
export type RequestHeader = {
  /** The key of the header. */
  key: string;
  /** The value of the header. */
  value: string;
  /** A description of the header. */
  description: string;
};

/**
 * Represents a Response Type.
 */
export type ResponseType = {
  /** The HTTP status code of the response. */
  code: number;
  /** The HTTP status message of the response. */
  status: string;
  /** The body content of the response. */
  body: string;
};
