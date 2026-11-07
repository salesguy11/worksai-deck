import os
import json,re,base64,sys,os
D=os.path.dirname(os.path.abspath(__file__))
UPDATED = sys.argv[1] if len(sys.argv)>1 else '2026.11.07'
m=json.load(open(os.path.join(D,'final.json')))
data=[{'No':o['No'],'t':o['title'],'g':o['industry_group'],'a':o['area'],'p':o['problem'],'h':o['how'],
       'c':o['works_can'],'e':o['works_extra'],'f':o['fit'],'k':o['keywords'],'r':o['region'],'s':o['stype'],'u':o['url']} for o in m]
js=json.dumps(data,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
cover='data:image/jpeg;base64,'+base64.b64encode(open(os.path.join(D,'cover.jpg'),'rb').read()).decode()
html=open(os.path.join(D,'template.html')).read().replace('__DATA__',js).replace('__COVER__',cover).replace('__UPDATED__',UPDATED)
OUT=os.path.join(D,'..','..','docs','cases','index.html')
open(OUT,'w').write(html)
print(len(html)//1024,'KB', 'cases',len(data))
assert '콜마' not in html and '__' not in html.replace('__proto__','')
print('emoji',re.findall('[\U0001F300-\U0001FAFF☀-➿]',html))
print('pct',re.findall(r'\d+\s*%',json.dumps([{k:v for k,v in d.items() if k!='u'} for d in data],ensure_ascii=False))[:5])
