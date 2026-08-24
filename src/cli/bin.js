#!/usr/bin/env node
import { Command } from 'commander';
import { init, resolvePackageVersion } from './init.js';

const COMMANDS = {
    init: init
}

const main = () => {
    const program = new Command();
    program.name('accrue');
    program.version(resolvePackageVersion());
    program
        .command('init')
        .description('Initialize Accrue')
        .action(async () => await COMMANDS.init());
    program.parse(process.argv);
}

main();