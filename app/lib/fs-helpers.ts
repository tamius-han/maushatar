import * as fs from 'fs';

export function ensureDirSync(dir: string) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, {recursive: true});
  }
}

export async function readJson(filePath: string) {
  const data: string = await new Promise(
    (resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          reject(err);
        }
        resolve(data.trim());
      })
  });
  return JSON.parse(data);
}

export async function saveJson(object: any, filePath: string) {
  return new Promise( (resolve, reject) => {
    fs.writeFile(filePath, JSON.stringify(object), err => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
}

export function isFileSync(filePath: string) {
  return fs.lstatSync(filePath).isFile();
}
export function isDirectorySync(filePath: string) {
  return fs.lstatSync(filePath).isDirectory();
}

export async function ls(path: string): Promise<string[]> {
  return new Promise((resolve, reject) => {
    fs.readdir(path, (err, files) => {
      if (err) {
        reject(err);
      }
      resolve(files);
    });
  });
}

export async function rm(path: string) {
  return new Promise((resolve, reject) => {
    if (isFileSync(path)) {
      fs.unlink(path, (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    } else {
      fs.rmdir(path, (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    }
  });
}