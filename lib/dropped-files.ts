export async function filesFromDataTransfer(dataTransfer: DataTransfer): Promise<File[]> {
  const entries = [...dataTransfer.items]
    .map((item) => item.webkitGetAsEntry())
    .filter((entry): entry is FileSystemEntry => Boolean(entry));
  if (entries.length === 0) return [...dataTransfer.files];
  const files = await Promise.all(entries.map(readEntryFiles));
  return files.flat();
}

async function readEntryFiles(entry: FileSystemEntry): Promise<File[]> {
  if (entry.isFile) return [await readFileEntry(entry as FileSystemFileEntry)];
  if (entry.isDirectory) return readDirectoryEntry(entry as FileSystemDirectoryEntry);
  return [];
}

function readFileEntry(entry: FileSystemFileEntry): Promise<File> {
  return new Promise((resolve, reject) => entry.file(resolve, reject));
}

async function readDirectoryEntry(entry: FileSystemDirectoryEntry): Promise<File[]> {
  const entries = await readAllDirectoryEntries(entry.createReader());
  const files = await Promise.all(entries.map(readEntryFiles));
  return files.flat();
}

async function readAllDirectoryEntries(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  const entries: FileSystemEntry[] = [];
  while (true) {
    const batch = await readDirectoryBatch(reader);
    if (batch.length === 0) return entries;
    entries.push(...batch);
  }
}

function readDirectoryBatch(reader: FileSystemDirectoryReader): Promise<FileSystemEntry[]> {
  return new Promise((resolve, reject) => reader.readEntries(resolve, reject));
}
