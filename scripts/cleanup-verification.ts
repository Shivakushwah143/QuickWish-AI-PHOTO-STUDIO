import {deleteImage} from '../apps/api/src/media';
import {rm} from 'node:fs/promises';
const file='.private/last-verification-asset.json';
if(!await Bun.file(file).exists()){console.log('No locally recorded verification fixture. Inspect Cloudinary if an earlier upload timed out before returning its ID.');process.exit(0)}
try{const a=await Bun.file(file).json();if(a.provider!=='CLOUDINARY'||!/^quickwish\/private\/[a-f0-9-]+$/.test(a.storage_id))throw new Error('Unexpected asset');await deleteImage(a);await rm(file);console.log('Verification fixture removed.')}catch{console.error('Cleanup could not be confirmed; private fixture record retained for retry.');process.exitCode=1}
