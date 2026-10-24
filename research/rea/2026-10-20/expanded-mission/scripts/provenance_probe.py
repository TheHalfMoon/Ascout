import copy,hashlib,json,os,pathlib,sys
from in_toto.runlib import in_toto_run
from in_toto.models.layout import Layout,Step,Inspection
from in_toto.models.metadata import Metablock
from in_toto.verifylib import in_toto_verify
from securesystemslib.signer import CryptoSigner

d=pathlib.Path(sys.argv[1]);d.mkdir(parents=True,exist_ok=True);os.chdir(d)
owner=CryptoSigner.generate_ed25519();worker=CryptoSigner.generate_ed25519()
pub=worker.public_key;key={**pub.to_dict(),'keyid':pub.keyid}
cmd=[sys.executable,'-c','from pathlib import Path;Path("product.txt").write_text("verified bytes")']
link=in_toto_run(name='build',material_list=[],product_list=['product.txt'],link_cmd_args=cmd,record_streams=True,signer=worker)
step=Step(name='build',pubkeys=[pub.keyid],expected_command=cmd,expected_materials=[['DISALLOW','*']],expected_products=[['CREATE','product.txt'],['DISALLOW','*']])
inspection=Inspection(name='inspect',run=[sys.executable,'-c','pass'],expected_materials=[['MATCH','product.txt','WITH','PRODUCTS','FROM','build']],expected_products=[])
layout=Layout(steps=[step],inspect=[inspection],keys={pub.keyid:key});layout.set_relative_expiration(days=1)
meta=Metablock(signed=layout);meta.create_signature(owner)
ownerkey={**owner.public_key.to_dict(),'keyid':owner.public_key.keyid}
out=[]
def verify(label,m=meta,keys=None):
 try:
  in_toto_verify(m,keys if keys is not None else {owner.public_key.keyid:ownerkey},persist_inspection_links=False)
  out.append({'case':label,'result':'VERIFIED'})
 except Exception as e:out.append({'case':label,'result':'REJECTED','exception':type(e).__name__,'message':str(e)})
verify('permissive-layout-valid')
pathlib.Path('product.txt').write_text('tampered bytes');verify('permissive-layout-tampered-product');pathlib.Path('product.txt').write_text('verified bytes')
verify('missing-trust-root',keys={})
wrong=CryptoSigner.generate_ed25519();verify('wrong-trust-root',keys={wrong.public_key.keyid:{**wrong.public_key.to_dict(),'keyid':wrong.public_key.keyid}})
changed=copy.deepcopy(meta);changed.signed.steps[0].expected_command=['unexpected-command'];verify('tampered-layout-signature',m=changed)
alternate=copy.deepcopy(meta);alternate.signed.steps[0].expected_command=['unexpected-command'];alternate.signatures=[];alternate.create_signature(owner);verify('resigned-expected-command-mismatch',m=alternate)
strict=copy.deepcopy(meta)
strict.signed.inspect[0].expected_materials=[['REQUIRE','product.txt'],['MATCH','product.txt','WITH','PRODUCTS','FROM','build'],['DISALLOW','*']]
strict.signatures=[];strict.create_signature(owner)
verify('strict-layout-valid',m=strict)
pathlib.Path('product.txt').write_text('tampered bytes');verify('strict-layout-tampered-product',m=strict)
pathlib.Path('product.txt').unlink();verify('strict-layout-missing-product',m=strict);pathlib.Path('product.txt').write_text('verified bytes')
expired=copy.deepcopy(strict);expired.signed.expires='2000-01-01T00:00:00Z';expired.signatures=[];expired.create_signature(owner);verify('expired-layout',m=expired)
# A failed process can still yield a valid signed link; verification must reject its return code.
bad=in_toto_run(name='failed',material_list=[],product_list=[],link_cmd_args=[sys.executable,'-c','raise SystemExit(7)'],signer=worker)
out.append({'case':'failed-step-record','signed':bool(bad.signatures),'recorded_return_value':bad.signed.byproducts['return-value']})
print(json.dumps({'cases':out,'versions':{'in-toto':__import__('importlib.metadata',fromlist=['version']).version('in-toto')},'scope':'local ephemeral Ed25519 keys; fixture product and inspected local product only; does not prove command correctness or runtime source completeness'},indent=2))
