const jar = new Map<string, string>();

export const cookieStore = {
  get(name: string) {
    const value = jar.get(name);
    return value === undefined ? undefined : { name, value };
  },
};

export function setCookie(name: string, value: string) {
  jar.set(name, value);
}

export function clearCookies() {
  jar.clear();
}
