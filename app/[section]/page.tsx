import {notFound} from 'next/navigation';
import Portal from '../portal';
const allowed=['actualites','programme','association','structures','projets','honneur','contacts','documents','confidentialite','adhesion','espace','evenements','forum','administration','comptabilite','communication','moderation','verification','tests'];
export default async function Page({params}:{params:Promise<{section:string}>}){const {section}=await params;if(!allowed.includes(section))notFound();return <Portal section={section}/>}
