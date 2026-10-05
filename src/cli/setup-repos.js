import inquirer from 'inquirer';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

export const enumerateRepos = async () => {
    const entries = await fs.readdir(process.cwd(), { withFileTypes: true });
    // filter out non-directories
    return entries.filter(entry => entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules').map(entry => entry.name);
}

export const normalizeRepoPath = (input) => {
    const expanded = input.trim().replace(/^~(?=$|\/)/, os.homedir());
    const relative = path.relative(process.cwd(), path.resolve(process.cwd(), expanded));
    return (relative || '.').split(path.sep).join('/');
}

const isDirectory = async (repoPath) => {
    try {
        return (await fs.stat(repoPath)).isDirectory();
    } catch {
        return false;
    }
}

const showRepos = async (label, repos) => {
    const formatted = await Promise.all(repos.map(async repo => (await isDirectory(repo)) ? repo : `${repo} (missing)`));
    console.log(`${label}: ${formatted.join(', ')}`);
}

const showSelectedRepos = (repos) => showRepos('Selected repos', repos);

const scanRepos = async (selected) => {
    const found = await enumerateRepos();
    const answer = await inquirer.prompt([
        {
            type: 'checkbox',
            name: 'repos',
            message: 'Select repos to include',
            choices: found.map(repo => ({ name: repo, value: repo, checked: selected.includes(repo) })),
        }
    ]);
    return [
        ...selected.filter(repo => !found.includes(repo) || answer.repos.includes(repo)),
        ...answer.repos.filter(repo => !selected.includes(repo)),
    ];
}

export const configureRepos = async (existingRepos = []) => {
    let reposToAdd = [...existingRepos];

    if (reposToAdd.length > 0) {
        await showRepos('Configured repos', reposToAdd);
    } else {
        const answer = await inquirer.prompt([
            {
                type: 'confirm',
                name: 'scan',
                message: 'Scan current directory for repos?',
            }
        ]);
        if (answer.scan) {
            reposToAdd = await scanRepos(reposToAdd);
            await showSelectedRepos(reposToAdd);
        }
    }

    while (true) {
        const choices = [
            { key: 'a', name: 'Add', value: 'add' },
            { key: 's', name: 'Scan', value: 'scan' },
            ...(reposToAdd.length > 0 ? [{ key: 'r', name: 'Remove', value: 'remove' }] : []),
            { key: 'c', name: 'Continue', value: 'continue' }
        ];
        const actionAnswer = await inquirer.prompt([
            {
                type: 'expand',
                name: 'action',
                message: choices.map(c => `(${c.key.toUpperCase()})${c.name.slice(1)}`).join(' '),
                choices,
            }
        ]);

        if (actionAnswer.action === 'add') {
            // allow user to type a path
            const pathAnswer = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'path',
                    message: 'Enter the path to the repo to add:',
                }
            ]);
            const repoPath = normalizeRepoPath(pathAnswer.path);
            if (!(await isDirectory(repoPath))) {
                console.log(`Not a directory: ${pathAnswer.path}`);
            } else if (!reposToAdd.includes(repoPath)) {
                reposToAdd.push(repoPath);
            }
            await showSelectedRepos(reposToAdd);
        } else if (actionAnswer.action === 'scan') {
            reposToAdd = await scanRepos(reposToAdd);
            await showSelectedRepos(reposToAdd);
        } else if (actionAnswer.action === 'remove') {
            // allow user to select one or more repos to remove
            const removeAnswer = await inquirer.prompt([
                {
                    type: 'checkbox',
                    name: 'remove',
                    message: 'Select repos to remove:',
                    choices: reposToAdd.map(repo => ({
                        name: repo,
                        value: repo
                    })),
                }
            ]);
            reposToAdd = reposToAdd.filter(repo => !removeAnswer.remove.includes(repo));
            await showSelectedRepos(reposToAdd);
        } else if (actionAnswer.action === 'continue') {
            break;
        } else {
            console.error('Invalid action');
            break;
        }
    }

    const added = reposToAdd.filter(repo => !existingRepos.includes(repo));
    const removed = existingRepos.filter(repo => !reposToAdd.includes(repo));
    if (added.length === 0 && removed.length === 0) {
        console.log('No changes');
        return existingRepos;
    }

    console.log([...added.map(repo => `+ ${repo}`), ...removed.map(repo => `- ${repo}`)].join(', '));
    const confirmResult = await inquirer.prompt([
        {
            type: 'confirm',
            name: 'confirm',
            message: 'Save changes?',
        }
    ]);
    return confirmResult.confirm ? reposToAdd : existingRepos;
}