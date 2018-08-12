const path = require('path')
const fs = require('fs')
const util = require('util')

const copyFile = util.promisify(fs.copyFile)
const readFile = util.promisify(fs.readFile)
const writeFile = util.promisify(fs.writeFile)
const mkdir = util.promisify(fs.mkdir)

const getPackages = require('../packages')
const filesPerBaseDir = {
    react: [
        'baseTypes.ts',
        'index.ts',
        'withEffects.ts',
        'compose.ts',
        'configureComponent.ts',
        ({ obsLib }) => ({
            src: `observable${obsLib === 'rxjs' ? '' : `_${obsLib}`}.ts`,
            dest: 'observable.ts'
        })
    ],
    redux: [
        'baseTypes.ts',
        'index.ts',
        'refractEnhancer.ts',
        ({ obsLib }) => ({
            src: `observable${obsLib === 'rxjs' ? '' : `_${obsLib}`}.ts`,
            dest: 'observable.ts'
        })
    ]
}

copyAll()

async function copyAll() {
    await copyBaseFiles('react')
    await copyBaseReadme('react')
    await copyBaseFiles('preact')
    // await copyBaseReadme('preact')
    await copyBaseFiles('redux')
    await copyBaseReadme('redux')
}

async function copyBaseFiles(mainLib) {
    const files = getPackages(mainLib).reduce(
        (copyPromises, package) =>
            copyPromises
                .concat([
                    {
                        src: getBaseFilePath('all', '.npmignore'),
                        dest: getPackageFilePath(package.name, '.npmignore')
                    }
                ])
                .concat(
                    filesPerBaseDir[package.baseDir].map(fileName => {
                        let srcFileName, destFileName
                        if (typeof fileName === 'function') {
                            const files = fileName(package)
                            srcFileName = files.src
                            destFileName = files.dest
                        } else {
                            srcFileName = fileName
                            destFileName = fileName
                        }

                        return {
                            src: getBaseFilePath(package.baseDir, srcFileName),
                            dest: getPackageFilePath(
                                package.name,
                                path.join('src', destFileName)
                            )
                        }
                    })
                ),
        []
    )

    try {
        getPackages().map(
            async ({ name }) =>
                await mkdir(getPackageFilePath(name, 'src')).catch(() => {})
        )

        files.map(async ({ src, dest }) => await copyFile(src, dest))
    } catch (e) {
        console.error(e.toString())
    }
}

async function copyBaseReadme(mainLib) {
    try {
        const readme = await readFile(
            path.resolve(__dirname, '..', 'base', mainLib, 'README.tpl.md')
        )

        getPackages(mainLib).map(
            async package =>
                await writeFile(
                    getPackageFilePath(package.name, 'README.md'),
                    readme.toString().replace(/LIBRARY_NAME/g, package.name)
                )
        )
    } catch (e) {
        console.error(e.toString())
    }
}

function getBaseFilePath(baseDir, file) {
    return path.resolve(__dirname, '..', 'base', baseDir, file)
}

function getPackageFilePath(package, file) {
    return path.resolve(__dirname, '..', 'packages', package, file)
}
