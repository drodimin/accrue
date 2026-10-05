import { describe, it, expect, vi, afterEach } from 'bun:test';
import fs from 'fs';
import inquirer from 'inquirer';
import { verifyAccrueFolder, getOrCreateConfig, init } from './init.js';
import { ACCRUE_FOLDER, CONFIG_FILENAME } from './init.js';
import path from 'path';

describe('init', () => {
const MOCK_CWD = '/mock/dir';

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create a .accrue folder when no folder is present', () => {
    vi.spyOn(process, 'cwd').mockReturnValue(MOCK_CWD);
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const mkdirSyncMock = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {});

    verifyAccrueFolder();

    expect(fs.existsSync).toHaveBeenCalledWith(path.join(MOCK_CWD, ACCRUE_FOLDER));
    expect(mkdirSyncMock).toHaveBeenCalledWith(path.join(MOCK_CWD, ACCRUE_FOLDER));
  });

  it('should not create a .accrue folder when one is present', () => {
    vi.spyOn(process, 'cwd').mockReturnValue(MOCK_CWD);
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    const mkdirSyncMock = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {});

    verifyAccrueFolder();

    expect(fs.existsSync).toHaveBeenCalledWith(path.join(MOCK_CWD, ACCRUE_FOLDER));
    expect(mkdirSyncMock).not.toHaveBeenCalled();
  });

  it('should create a config file when no config file is present', () => {
    vi.spyOn(process, 'cwd').mockReturnValue(MOCK_CWD);
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const writeFileSyncMock = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    const readFileSyncMock = vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
      version: '0.0.1'
    }));
    const config = getOrCreateConfig();

    expect(writeFileSyncMock).toHaveBeenCalledWith(path.join(ACCRUE_FOLDER, CONFIG_FILENAME), JSON.stringify({
      version: '0.0.1'
    }));    expect(config).toEqual({
      version: '0.0.1'
    });
  });

  it('should throw an error when the accrue folder cannot be verified', () => {
    vi.spyOn(process, 'cwd').mockReturnValue(MOCK_CWD);
    vi.spyOn(fs, 'existsSync').mockReturnValue(false);
    const mkdirSyncMock = vi.spyOn(fs, 'mkdirSync').mockImplementation(() => {
      throw new Error('Error verifying accrue folder');
    });

    expect(() => verifyAccrueFolder()).toThrow('Error verifying accrue folder');
  });

  it('normalizes repo paths from the existing config and removes duplicates', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue(MOCK_CWD);
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
      version: '0.0.1',
      repos: ['repo-a', './repo-b', 'repo-b/', '../shared']
    }));
    const writeFileSyncMock = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    vi.spyOn(inquirer, 'prompt').mockResolvedValue({ action: 'continue', confirm: true });

    await init();

    expect(writeFileSyncMock).toHaveBeenCalledWith(path.join(ACCRUE_FOLDER, CONFIG_FILENAME), JSON.stringify({
      version: '0.0.1',
      repos: ['repo-a', 'repo-b', '../shared']
    }, null, 2));
  });

  it('passes existing selection from the config to the setupRepos', async () => {
    vi.spyOn(process, 'cwd').mockReturnValue(MOCK_CWD);
    vi.spyOn(fs, 'existsSync').mockReturnValue(true);
    vi.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({
      version: '0.0.1',
      repos: ['api', 'web']
    }));
    const writeFileSyncMock = vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    vi.spyOn(inquirer, 'prompt').mockResolvedValue({ enumerate: false, action: 'continue', confirm: true });

    await init();

    expect(writeFileSyncMock).toHaveBeenCalledWith(path.join(ACCRUE_FOLDER, CONFIG_FILENAME), JSON.stringify({
      version: '0.0.1',
      repos: ['api', 'web']
    }, null, 2));
  });
});