// Helpers for displaying & grouping uploaded files

// Extension/type label for an upload (falls back to the mime subtype)
export const getFileExt = (u: { file_name?: string; file_type?: string }): string => {
  const name = u?.file_name || '';
  const dot = name.lastIndexOf('.');
  if (dot > -1 && dot < name.length - 1) {
    return name.slice(dot + 1).toUpperCase().slice(0, 5);
  }
  const sub = (u?.file_type || '').split('/').pop();
  return sub ? String(sub).toUpperCase().slice(0, 5) : 'FILE';
};

// Detect "SN" documents from the file name (e.g. "SN 26 ...", "SN_26", "SN26")
export const isSnFile = (name: string = ''): boolean => /(^|[\s_-])sn(?![a-z])/i.test(name);
