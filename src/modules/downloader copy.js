const fs = require('fs');
const ytdl = require('ytdl-core');
const path = require('path');
const { getVideoName } = require('./checkVideo');
const { checkPath, moveFile } = require('./checkPath');
const { exec } = require('child_process');
const { guardarEnLog } = require('./fntLog')
const { app } = require('electron');
const asar = require('asar');

// Ruta al ejecutable 
const ejecutable = path.join(__dirname, '../../');
guardarEnLog('downloader.js', 'combineFiles', 'dirname: '+__dirname )
guardarEnLog('downloader.js', 'combineFiles', 'ejecutable: '+ejecutable )
const command = `cd "${ejecutable}" && combine.exe`
// const command = `cd "${ejecutable}" && combine.exe`
// const ejecutable = path.join(__dirname, 'python/dist');
function deleteTempFile(file){
    let data = {
        estatus: false,
        error: ''
    }
    fs.unlink(file, (error) => {
        if (error) {
            console.error('Error al borrar el archivo: ', error);
            data.error = 'Error al borrar el archivo: ' + error;
            guardarEnLog('downloader.js', 'deleteTempFile', 'Error al borrar el archivo:' + error)
        } else {
            console.log('Archivo borrado correctamente');
            data.estatus = true;
        }
    });
    return data
}

async function downloadVideo(videoUrl, videoName) {
    console.log('Descargando video...')
    guardarEnLog('downloader.js', 'downloadVideo', 'Video: ' + videoName)
    return new Promise((resolve, reject) => {
        ytdl(videoUrl)
            .pipe(fs.createWriteStream(videoName))
            .on('finish', () => {
            console.log('Video descargado!');
            resolve(true);
            })
        .on('error', (error) => {
            console.error('Error en la descarga: ', error);
            guardarEnLog('downloader.js', 'downloadVideo', 'Error en la descarga: ' + error)
            reject(false);
        });
    });
}
    
async function downloadAudio(videoUrl, videoName) {
    console.log('Descargando audio...')
    return new Promise((resolve, reject) => {
        const options = {
            filter: 'audioonly',
            quality: 'highestaudio',
            format: 'mp3'
        };
        ytdl(videoUrl, options)
            .pipe(fs.createWriteStream( videoName))
            .on('finish', () => {
            console.log('Audio descargado!');
            resolve(true);
            })
        .on('error', (error) => {
            console.error('Error en la descarga:', error);
            guardarEnLog('downloader.js', 'downloadAudio', 'Error en la descarga: ' + error)
            reject(false);
        });
    });
}

async function combineFiles(){
    console.log('Combinando archivos..')
    guardarEnLog('downloader.js', 'combineFiles', 'Command: '+command )
    return new Promise((resolve, reject) => {
        // Obtén la ruta del archivo app.asar dentro de tu aplicación
        const appAsarPath = path.join(app.getAppPath());
        guardarEnLog('downloader.js', 'combineFiles', 'App: '+ appAsarPath )
        // Extrae el contenido de app.asar a un directorio temporal
        // const tempDirectory = path.join(app.getPath('temp'), 'MyYT_Downloader');

        guardarEnLog('downloader.js', 'combineFiles', 'temp: '+ tempDirectory )
        asar.extractAll(appAsarPath, tempDirectory);
        const tempDirectory = path.join(appAsarPath, '../../', 'MyYT_Downloader');
        // Ruta al archivo combine.exe dentro del directorio temporal
        // const combineExePath = path.join(tempDirectory, 'src/modules/python/dist/combine.exe');
        const combineExePath = path.join(tempDirectory, 'combine.exe');
        guardarEnLog('downloader.js', 'combineFiles', 'CombineExe: '+ combineExePath )
        if (fs.existsSync(path.join(tempDirectory, 'combine.exe'))) {
            console.log('El archivo existe.');
            exec(combineExePath, (error, stdout, stderr) => {
                if (error) {
                    console.error('Error al combinar los archivos:', error);
                    guardarEnLog('downloader.js', 'combineFiles', 'Error combineExePath: '+error )
                    reject(error);
                } else {
                    console.log('Archivos combinados!');
                    resolve(true);
                }
            });
        } else {
            console.log('El archivo no existe.');
            guardarEnLog('downloader.js', 'combineFiles', 'El archivo no existe.' )
            reject(error);
        }
        // Comprueba si el archivo combine.exe existe
        // if (asar.statFile(appAsarPath, 'src/modules/python/dist/combine.exe').size !== -1) {
        //     // Ejecuta combine.exe
        //     exec(combineExePath, (error, stdout, stderr) => {
        //     if (error) {
        //         console.error('Error al combinar los archivos:', error);
        //         guardarEnLog('downloader.js', 'combineFiles', 'Error combineExePath: '+error )
        //         reject(error);
        //     } else {
        //         console.log('Archivos combinados!');
        //         resolve(true);
        //     }
        //     });
        // } else {
        //     console.error('El archivo combine.exe no existe en app.asar');
        //     guardarEnLog('downloader.js', 'combineFiles', 'El archivo combine.exe no existe en app.asar')
        //     reject(new Error('Archivo no encontrado'));
        // }
        
    });
}

async function downloader(videoUrl, option, ApiKey){
    let result = false;
    let videoName = await getVideoName(videoUrl, ApiKey)
    console.log('video: ' + videoName)
    // videoName = path.join(checkPath(), videoName)
    if(option === 'v'){
        const video = await downloadVideo(videoUrl, path.join(checkPath(), videoName+ '.mp4'))
        result = video;
    }
    else if(option === 'a'){
        const audio = await downloadAudio(videoUrl, path.join(checkPath(), videoName + '.mp3'))
        result = audio;
    }
    else if(option === 'va'){
        guardarEnLog('downloader.js', 'downloader', 'ruta actual: ' + __dirname)
        const video = await downloadVideo(videoUrl, path.join(checkPath(), 'video.mp4'))
        const audio = await downloadAudio(videoUrl, path.join(checkPath(), 'audio.mp3'))
        if(video && audio){
            try {
                const resultado = await combineFiles();
                if(resultado){
                    moveFile(checkPath(), 'output.mp4', videoName + '.mp4' );
                    deleteTempFile(path.join(checkPath(), 'video.mp4'))
                    deleteTempFile(path.join(checkPath(), 'audio.mp3'))
                    result = resultado;
                }
            } catch (error) {
                console.error('error: ' + error);
                guardarEnLog('downloader.js', 'downloader', 'Error: ' + error)
                result = false;
            }
        }
    }
    return result
}

module.exports = {
    downloader
}