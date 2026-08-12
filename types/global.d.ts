declare global {
  type RouteContext<T extends string = string> = {
    params: Promise<{ id: string }>;
  };
}

export {};
