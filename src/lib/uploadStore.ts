export class UploadDirEmptyError extends Error {
  constructor(dir: string, stored: number) {
    super(
      `${dir} holds no files, but the database references ${stored}. The directory the uploads live on is not the one being read, which on a hosted service usually means the persistent disk did not mount. Refusing to start rather than serving an empty store.`,
    );
    this.name = "UploadDirEmptyError";
  }
}

export function uploadStoreIsMissing(state: { files: number; stored: number }): boolean {
  return state.files === 0 && state.stored > 0;
}
