if (document.querySelector('#gitalk-container')) {
  const gitalk = new Gitalk({
    clientID: '8cc2aa4433761e9f5cbd',
    clientSecret: '2a19212c022660d03a633e3b2c52b0b58db95e08',
    repo: 'hotaery.github.io',
    owner: 'hotaery',
    admin: ['hotaery'],
    id: location.pathname, // Ensure uniqueness and length less than 50
    distractionFreeMode: false, // Facebook-like distraction free mode
  });

  gitalk.render('gitalk-container');
}