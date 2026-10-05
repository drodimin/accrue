import { describe, it, expect, vi, afterEach } from 'vitest';
import fs from 'fs/promises';
import inquirer from 'inquirer';
import { enumerateRepos, configureRepos } from './setup-repos';

const mockPrompts = (answers) =>
    vi.spyOn(inquirer, 'prompt').mockImplementation(async ([question]) => ({
        [question.name]: answers[question.name]?.shift(),
    }));

const mockDirectories = (names) =>
    vi.spyOn(fs, 'readdir').mockResolvedValue(names.map(name => ({ name, isDirectory: () => true })));

describe('setup-repos', () => {
    afterEach(() => {
        vi.restoreAllMocks();
    });
    it('enumerateRepos returns a list of directories', async () => {
        vi.spyOn(fs, 'readdir').mockResolvedValue([
            { name: 'repo1', isDirectory: () => true },
            { name: 'example.js', isDirectory: () => false },
            { name: 'repo2', isDirectory: () => true },
        ]);
        const repos = await enumerateRepos();
        expect(repos).toEqual(['repo1', 'repo2']);
    });

    it('enumerateRepos excludes hidden directories', async () => {
        vi.spyOn(fs, 'readdir').mockResolvedValue([
            { name: '.repo1', isDirectory: () => true },
            { name: 'repo2', isDirectory: () => true },
            { name: 'repo3', isDirectory: () => true },
        ]);
        const repos = await enumerateRepos();
        expect(repos).toEqual(['repo2', 'repo3']);
    });

    it('setupRepos starts with existing repos if they are passed in', async () => {
        vi.spyOn(inquirer, 'prompt').mockResolvedValue({ enumerate: false, action: 'continue', confirm: true });
        const repos = await configureRepos(['api', 'web']);
        expect(repos).toEqual(['api', 'web']);
    });

    it('setupRepos keeps existing repos when the user declines', async () => {
        mockPrompts({ action: ['remove', 'continue'], remove: [['web']], confirm: [false] });
        const repos = await configureRepos(['api', 'web']);
        expect(repos).toEqual(['api', 'web']);
    });

    it('setupRepos scan keeps checked folders, drops unchecked ones, and keeps repos added by path', async () => {
        mockDirectories(['api', 'web', 'docs']);
        mockPrompts({ action: ['scan', 'continue'], repos: [['web', 'docs']], confirm: [true] });
        const repos = await configureRepos(['api', '../lib']);
        expect(repos).toEqual(['../lib', 'web', 'docs']);
    });

    it('setupRepos does not ask for confirmation when the repos did not change', async () => {
        const promptMock = mockPrompts({ action: ['continue'] });
        await configureRepos(['api', 'web']);
        const askedQuestions = promptMock.mock.calls.map(([[question]]) => question.name);
        expect(askedQuestions).not.toContain('confirm');
    });

    it('setupRepos marks configured repos that no longer exist on disk as missing', async () => {
        vi.spyOn(fs, 'stat').mockImplementation(async (repoPath) => {
            if (repoPath === 'gone') throw new Error('ENOENT');
            return { isDirectory: () => true };
        });
        const logMock = vi.spyOn(console, 'log').mockImplementation(() => {});
        mockPrompts({ action: ['continue'] });
        await configureRepos(['api', 'gone']);
        expect(logMock).toHaveBeenCalledWith('Configured repos: api, gone (missing)');
    });
});