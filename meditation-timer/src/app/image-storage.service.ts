import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class ImageStorageService {
  private dbPromise: Promise<IDBDatabase>;
  private readonly DB_NAME = 'meditation-timer-db';
  private readonly STORE_NAME = 'images';
  private readonly DB_VERSION = 1;

  constructor() {
    this.dbPromise = this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          db.createObjectStore(this.STORE_NAME);
        }
      };

      request.onsuccess = (event) => {
        resolve((event.target as IDBOpenDBRequest).result);
      };

      request.onerror = (event) => {
        reject('Error opening IndexedDB: ' + (event.target as IDBOpenDBRequest).error);
      };
    });
  }

  async saveImage(imageFile: File): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.put(imageFile, 'backgroundImage');

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject('Error saving image: ' + (event.target as IDBRequest).error);
    });
  }

  async getImage(): Promise<File | undefined> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get('backgroundImage');

      request.onsuccess = (event) => {
        resolve((event.target as IDBRequest).result as File | undefined);
      };
      request.onerror = (event) => reject('Error getting image: ' + (event.target as IDBRequest).error);
    });
  }

  async clearImage(): Promise<void> {
    const db = await this.dbPromise;
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(this.STORE_NAME, 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete('backgroundImage');

      request.onsuccess = () => resolve();
      request.onerror = (event) => reject('Error clearing image: ' + (event.target as IDBRequest).error);
    });
  }
}
