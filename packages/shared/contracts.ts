import { z } from 'zod';
export const consentVersion='2026-10-12-v1';
export const orderInput=z.object({styleId:z.uuid(),packageCode:z.enum(['INTRO','SINGLE','TRIO','FIVE']),phone:z.string().regex(/^\+?[1-9]\d{9,14}$/),email:z.union([z.email(),z.literal('')]).optional(),consent:z.literal(true),consentVersion:z.literal(consentVersion)});
export const claimInput=z.object({utr:z.string().trim().min(6).max(64).regex(/^[a-zA-Z0-9 -]+$/),claimedPaise:z.number().int().positive()});
export const verifyInput=z.object({reference:z.string().trim().min(6).max(64).regex(/^[a-zA-Z0-9 -]+$/),amount:z.number().int().positive(),payee:z.string().trim().min(3).max(100),observedAt:z.iso.datetime(),note:z.string().trim().min(10).max(1000),independentCheck:z.literal(true),eligibleBuyer:z.boolean().default(false)});
export const wishInput=z.object({name:z.string().trim().min(1).max(60),relationship:z.string().trim().max(40).default('friend'),tone:z.enum(['Heartfelt','Funny','Poetic','Simple']).default('Heartfelt'),language:z.enum(['English','Hindi','Hinglish']).default('English')});
export const reviewInput=z.object({decision:z.enum(['APPROVED','REJECTED']),reason:z.string().trim().min(5).max(1000),checks:z.array(z.enum(['likeness','skin','lighting','anatomy','style','artifacts','consent'])).default([])});
export const caseInput=z.object({type:z.enum(['SUPPORT','REVISION','REFUND','ACCESS']),note:z.string().trim().min(5).max(2000)});
export const refundInput=z.object({reference:z.string().trim().min(6).max(64),amount:z.number().int().positive(),settledAt:z.iso.datetime(),note:z.string().trim().min(10).max(1000),settlementConfirmed:z.literal(true)});
export const styleInput=z.object({slug:z.string().regex(/^[a-z0-9-]{3,60}$/),title:z.string().trim().min(3).max(80),category:z.string().trim().min(3).max(40),description:z.string().trim().min(10).max(500),published:z.boolean(),rightsConfirmed:z.literal(true)});
export const categoryInput=z.object({slug:z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).min(3).max(80),name:z.string().trim().min(2).max(80),description:z.string().trim().min(10).max(600),coverImageUrl:z.string().trim().min(1).max(500).optional(),imageAlt:z.string().trim().min(10).max(240),displayOrder:z.number().int().min(0).max(10000),published:z.boolean()});
export const styleAdminInput=styleInput.extend({categoryId:z.uuid(),imageUrl:z.string().trim().min(1).max(500).optional()});
export function normalizeReference(v:string){return v.replace(/[ -]/g,'').toUpperCase()}
export function mayDownload(payment:string,slot:string,entitlement:string,authorized:boolean){return payment==='VERIFIED'&&slot==='APPROVED'&&entitlement==='ACTIVE'&&authorized}
export function productionStatus(statuses:string[]){const n=statuses.filter(x=>x==='APPROVED').length;return n===statuses.length?'READY':n>0?'PARTIALLY_READY':statuses.includes('CANDIDATE_UPLOADED')?'QC_PENDING':statuses.includes('REJECTED')?'REVISION_REQUIRED':statuses.includes('GENERATING')?'IN_PROGRESS':'QUEUED'}
export function upiIntent(vpa:string,name:string,paise:number,code:string){return 'upi://pay?'+new URLSearchParams({pa:vpa,pn:name,am:(paise/100).toFixed(2),cu:'INR',tn:code,tr:code}).toString()}
