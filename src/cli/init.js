import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';

// `require` is not defined in ESM; createRequire brings it back so this runs under Node.
const require = createRequire(import.meta.url);

export const ACCRUE_FOLDER = '.accrue';
export const CONFIG_FILENAME = 'config.json';

export const resolvePackageVersion = () => {
    const packageJson = require('../../package.json');
    return packageJson.version;
}

const createConfigFile = () => {
    const configFile = path.join(ACCRUE_FOLDER, CONFIG_FILENAME);
    fs.writeFileSync(configFile, JSON.stringify({
        version: resolvePackageVersion()
    }));
}   

export const getOrCreateConfig = () => {
     //does it have a config.json file?
    const configFile = path.join(ACCRUE_FOLDER, CONFIG_FILENAME);
    if (fs.existsSync(configFile)) {
        console.log('Config file found');
    } else {
        createConfigFile();
        console.log(`Config file created: ${configFile}`);
    }
    return JSON.parse(fs.readFileSync(configFile, 'utf8'));
}

export const verifyAccrueFolder = () => {
    const accrueFolder = path.join(process.cwd(), ACCRUE_FOLDER);
    if (fs.existsSync(accrueFolder)) {
        console.log('Accrue folder found');
    } else {
        console.log('Accrue folder not found');
        fs.mkdirSync(accrueFolder);
    }
}

export const init = () => {
    try {
        verifyAccrueFolder();
    } catch (error) {
        console.error('Error verifying accrue folder:', error);
        throw error;
    }
    
    try {
        getOrCreateConfig();
    } catch (error) {
        console.error('Error getting or creating config:', error);
        throw error;
    }
}
