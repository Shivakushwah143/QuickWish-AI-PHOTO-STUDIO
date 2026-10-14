import {describe,test,expect} from 'bun:test';
import {orderInput,consentVersion,claimInput,verifyInput,reviewInput,wishInput,mayDownload,productionStatus,upiIntent,normalizeReference,isValidUpiVpa} from '../packages/shared/contracts';
const valid={styleId:crypto.randomUUID(),packageCode:'SINGLE',phone:'+919876543210',consent:true,consentVersion};
describe('AT-01/02 consent and authoritative input',()=>{
 test('explicit versioned consent required',()=>{expect(orderInput.safeParse(valid).success).toBe(true);for(const consent of [false,undefined,'true'])expect(orderInput.safeParse({...valid,consent}).success).toBe(false)});
 test('client price and status stripped',()=>{const x=orderInput.parse({...valid,amount:1,payment:'VERIFIED'});expect('amount' in x).toBe(false);expect('payment' in x).toBe(false)});
 test('stale notice and bad contact rejected',()=>{expect(orderInput.safeParse({...valid,consentVersion:'old'}).success).toBe(false);expect(orderInput.safeParse({...valid,phone:'123'}).success).toBe(false)});
});
describe('AT-03/04/08 payment contracts',()=>{
 test('UPI encodes exact paise, merchant and safe reference',()=>{const uri=upiIntent('STORE@UPI','A & B',4900,'QW-TEST');const p=new URL(uri).searchParams;expect(p.get('am')).toBe('49.00');expect(p.get('pn')).toBe('A & B');expect(p.get('pa')).toBe('store@upi');expect(p.get('cu')).toBe('INR');expect(p.get('tr')).toBe('QW-TEST');expect(p.get('tn')).toBe('QuickWish QW-TEST')});
 test('UPI uses dynamic package amounts',()=>{for(const amount of [1900,4900,9900,14900])expect(new URL(upiIntent('store@upi','QuickWish',amount,'QW-'+amount)).searchParams.get('am')).toBe((amount/100).toFixed(2))});
 test('invalid or demo merchant config is rejected',()=>{expect(isValidUpiVpa('9009917146@ptyes')).toBe(true);for(const vpa of ['demo@upi','placeholder@upi','bad-vpa','a@b'])expect(()=>upiIntent(vpa,'QuickWish',4900,'QW-TEST')).toThrow()});
 test('unsafe payment references are rejected',()=>{expect(()=>upiIntent('store@upi','QuickWish',4900,'../../secret')).toThrow();expect(()=>upiIntent('store@upi','QuickWish',4900,'QW TEST')).toThrow()});
 test('UTR is a claim, with no entitlement fields',()=>{const x=claimInput.parse({utr:'123456789012',claimedPaise:4900,payment:'VERIFIED'});expect('payment' in x).toBe(false)});
 test('verification requires independent attestation and actual fields',()=>{expect(verifyInput.safeParse({reference:'123456'}).success).toBe(false)});
 test('bank references normalize consistently',()=>{expect(normalizeReference('ab-12 3456')).toBe('AB123456')});
});
describe('AT-11/12/13/14/17/24 release gate',()=>{
 test('only all four conditions grant a download',()=>{let allowed=0;for(const p of ['NOT_SUBMITTED','CLAIM_PENDING_REVIEW','REJECTED','VERIFIED','REFUND_PENDING','REFUNDED'])for(const s of ['WAITING','CANDIDATE_UPLOADED','REJECTED','APPROVED'])for(const e of ['ACTIVE','REVOKED'])for(const auth of [true,false]){const ok=mayDownload(p,s,e,auth);if(ok)allowed++;expect(ok).toBe(p==='VERIFIED'&&s==='APPROVED'&&e==='ACTIVE'&&auth)}expect(allowed).toBe(1)});
 test('one of three approved is partial, not full delivery',()=>{expect(productionStatus(['APPROVED','WAITING','CANDIDATE_UPLOADED'])).toBe('PARTIALLY_READY')});
 test('all approved is ready',()=>expect(productionStatus(['APPROVED','APPROVED','APPROVED'])).toBe('READY'));
 test('replacement remains QC pending',()=>expect(productionStatus(['CANDIDATE_UPLOADED'])).toBe('QC_PENDING'));
 test('rejected candidate requires rework',()=>expect(productionStatus(['REJECTED'])).toBe('REVISION_REQUIRED'));
 test('review rejects unsupported decisions',()=>expect(reviewInput.safeParse({decision:'AUTO_APPROVE',reason:'skip QC'}).success).toBe(false));
});
describe('AT-18/19 wish validation',()=>{
 test('empty or excessive names blocked',()=>{expect(wishInput.safeParse({name:''}).success).toBe(false);expect(wishInput.safeParse({name:'a'.repeat(61)}).success).toBe(false)});
 test('allowed language and tone validated',()=>{expect(wishInput.safeParse({name:'Priya',language:'Hindi',tone:'Funny'}).success).toBe(true);expect(wishInput.safeParse({name:'Priya',tone:'unsafe'}).success).toBe(false)});
});
