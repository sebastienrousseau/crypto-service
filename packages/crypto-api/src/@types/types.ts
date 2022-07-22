/* eslint-disable  @typescript-eslint/no-explicit-any */
export type jsonDocument = {
  info: {
    description: string;
    name: string;
  };
  item: string;
};

export type jsonAuth = {
  bearer: any[];
  key: string;
  type: string;
  value: string;
};

export type jsonRequest = {
    header: any[];
    key: string;
    value: string;
    description: string;
}
