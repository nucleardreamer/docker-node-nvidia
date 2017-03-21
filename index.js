const { join } = require('path')
const { readFileSync } = require('fs')
const async = require('async')
const tar = require('tar-stream')
const scrape = require('scrape-it')
const Docker = require('dockerode')
const { process: dockerfile } = require('dockerfile-template')

const template = readFileSync(
  join(__dirname, 'Dockerfile.template'), 'utf8'
)

var docker = new Docker({
  socketPath: '/var/run/docker.sock'
})

function versions (cb) {
  scrape(
    'http://www.nvidia.com/object/linux-amd64-display-archive.html', 
    {
      all: {
        listItem: '#pressRoom .pressItem',
        data: {
          NVIDIA_VERSION: {
            selector: 'p',
            convert: t => {
              return t
              .split('\r\n')[0]
              .split('Operating')[0]
              .replace('Version: ', '')
            }
          }
        }
      }
    }, cb
  )
}

function start (items, [ BASE, BASE_TAG, DOCKER_TAG ]) {
  async.eachSeries(
    items.all,
    function ({ NVIDIA_VERSION }, cb) {
      let TAG = `${DOCKER_TAG}:${NVIDIA_VERSION}`
      console.log('* Starting:', TAG)

      // start an archive for our Dockerfile template
      let pack = tar.pack()

      // start image build, adding our tar stream
      let d = docker.buildImage(
        pack, 
        { t: TAG }, 
        function(err, stream) {
          if (err) return
          stream.pipe(process.stdout, { end: true })
          stream.on('end', function() {
            console.log('* Finished:', DOCKER_TAG + NVIDIA_VERSION)
            cb()
          })
        }
      )
      // write our dockerfile template to a tar stream
      let entry = pack.entry(
        { name: 'Dockerfile' }, 
        dockerfile(template, {
            BASE, BASE_TAG, NVIDIA_VERSION
        }),
        function (err) {
          if (err) throw err
          pack.finalize()
        }
      )
    },
    function (err) {
      if (err) throw err
    }
  )
}
// get each nvidia version
versions((err, items) => {
  // compile multiple base images
  [
    ['node', '6.5.0-slim', 'nucleardreamer/node-nvidia']
  ].map(m => start(items, m))
})
