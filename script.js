function imageSrc(value) {
  if (value) {
    this.setAttribute('src', value);
  } else {
    this.setAttribute('src', "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==");
  }
}

function asHTML(value) {
  this.innerHTML = value;
}

function shouldShow(value) {
  if (value == false || value == "") {
    this.style.display = 'none';
  } else {
    this.style.display = '';
  }
}

function setWidth(value) {
  this.style.width = `${value}px`;
}

(() => {
  var timeout;
  let {bskyPost, config} = bindIt({
    config: {
      corsProxy: "https://corsproxy.io/?url=",
      width: 600,
      windowDecoration: true,
      showInteractions: true
    },
    bskyPost: {
      url: 'https://bsky.app/profile/averagemarcus.bsky.social/post/3lujs2efm5s2f',
      handle: '',
      displayName: '',
      avatar: '',
      text: '',
      createdAt: '',
      likes: 0,
      reposts: 0,
      replies: 0,
      externalLink: {
        exists: false,
        title: "",
        description: "",
        image: "",
        domain: ""
      },
      images: {
        exists: false,
        image1: "",
        image2: "",
        image3: "",
        image4: "",
      }
    }
  });


  function isValidHttpUrl(string) {
    let url;
    try {
      url = new URL(string);
    } catch (_) {
      return false;
    }
    return url.protocol === "http:" || url.protocol === "https:";
  }

  function formatDate(d) {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    var d = new Date(d);
    let month = months[d.getMonth()];
    let ampm = "AM";
    let hour = d.getHours();
    if (hour > 12) {
      ampm = "PM";
      hour = hour - 12;
    } else if (hour == 12) {
      ampm = "PM";
    }

    return `${month} ${d.getDate()}, ${d.getFullYear()} at ${hour}:${d.getMinutes()} ${ampm}`;
  }

  async function loadPost() {
    bskyPost.url = document.getElementById('post-url').value
    if (!isValidHttpUrl(bskyPost.url)) {
      return;
    }
    let urlParts = bskyPost.url.split('/');
    let rKey = urlParts[6];
    let handle = urlParts[4];

    bskyPost.handle = `@${handle}`;

    let profile = await (await fetch(`https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${handle}`)).json();
    let did = profile.did;
    bskyPost.displayName = profile.displayName;
    bskyPost.avatar = config.corsProxy + profile.avatar;

    let record = await (await fetch(`https://public.api.bsky.app/xrpc/com.atproto.repo.getRecord?repo=${did}&collection=app.bsky.feed.post&rkey=${rKey}`)).json();
    console.log(record);
    let parts = [];
    let body = unescape(encodeURIComponent(record.value.text));
    let offset = 0;
    if (record.value.facets) {
      for (const facet of record.value.facets) {
        parts.push(body.substring(0, facet.index.byteStart - offset));
        body = body.substring(facet.index.byteStart - offset, body.length)
        offset = facet.index.byteStart;
        parts.push(body.substring(0, facet.index.byteEnd - offset));
        body = body.substring(facet.index.byteEnd - offset, body.length)
        offset = facet.index.byteEnd;
      }
    }
    parts.push(body);


    let postBody = "";
    for (let index = 0; index < parts.length; index++) {
      postBody += parts[index];
      if (index == parts.length-1) {

      } else if (index % 2 == 0) {
        postBody += '<span class="link">'
      } else {
        postBody += '</span>'
      }
    }
    bskyPost.text = decodeURIComponent(escape(postBody)).replaceAll("\n", "<br>");

    bskyPost.createdAt = formatDate(record.value.createdAt);

    let uri = record.uri;
    let postLikes = await (await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getLikes?uri=${uri}&limit=100`)).json();
    bskyPost.likes = postLikes.likes.length;

    let postReposts = await (await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getRepostedBy?uri=${uri}&limit=100`)).json();
    bskyPost.reposts = postReposts.repostedBy.length;

    let thread = await (await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=${uri}&parentHeight=1&depth=1000`)).json();
    bskyPost.replies = thread.thread.replies.length

    bskyPost.externalLink.exists = false;
    bskyPost.images.exists = false;
    bskyPost.images.image1 = "";
    bskyPost.images.image2 = "";
    bskyPost.images.image3 = "";
    bskyPost.images.image4 = "";

    if (record.value.embed && record.value.embed["$type"] == "app.bsky.embed.images") {
      bskyPost.images.exists = true;
      if (record.value.embed.images.length > 0) bskyPost.images.image1 = `${config.corsProxy}https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${record.value.embed.images[0].image.ref.$link}@jpeg`;
      if (record.value.embed.images.length > 1) bskyPost.images.image2 = `${config.corsProxy}https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${record.value.embed.images[1].image.ref.$link}@jpeg`;
      if (record.value.embed.images.length > 2) bskyPost.images.image3 = `${config.corsProxy}https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${record.value.embed.images[2].image.ref.$link}@jpeg`;
      if (record.value.embed.images.length > 3) bskyPost.images.image4 = `${config.corsProxy}https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${record.value.embed.images[3].image.ref.$link}@jpeg`;
    } else if (record.value.embed && record.value.embed["$type"] == "app.bsky.embed.external") {
      bskyPost.externalLink.exists = true;
      bskyPost.externalLink.title = record.value.embed.external.title;
      bskyPost.externalLink.description = record.value.embed.external.description;
      bskyPost.externalLink.domain = record.value.embed.external.uri.replaceAll("https://", "").split("/")[0];
      bskyPost.externalLink.image = `${config.corsProxy}https://cdn.bsky.app/img/feed_thumbnail/plain/${did}/${record.value.embed.external.thumb.ref["$link"]}@jpeg`;
    }
  }

  function updateImage() {
    if (timeout) {
      window.cancelAnimationFrame(timeout);
    }
    timeout = window.requestAnimationFrame(function() {
      domtoimage.toPng(document.getElementById('post'), { cacheBust: false })
        .then(function (dataUrl) {
          document.getElementById('result-image').src = dataUrl;
        });
    });
  }
  [...document.querySelectorAll('#post img'), ...document.querySelectorAll('#input-form input')].forEach(el => el.addEventListener("load", updateImage));

  document.getElementById('submit').addEventListener('click', loadPost);
  document.getElementById('post-url').addEventListener('change', loadPost);
  document.getElementById('post-url').addEventListener('keyup', loadPost);
  window.requestAnimationFrame(loadPost);

  document.getElementById('download').addEventListener('click', function() {
    let link = document.createElement('a');
    link.download = 'post.png';
    link.href = document.getElementById('result-image').src;
    link.click();
  });
})();
