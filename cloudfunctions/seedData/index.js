// cloudfunctions/seedData/index.js - 测试数据种子脚本
// 上传此云函数后，在云开发控制台 -> 云函数 -> seedData -> 点击"测试"即可插入测试数据
const cloud = require('wx-server-sdk');
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });
const db = cloud.database();

exports.main = async (event, context) => {
  try {
    const results = {};

    // ========== 1. 分类数据 ==========
    const catCount = await db.collection('categories').count();
    if (catCount.total === 0) {
      const categories = [
        { id: 'agri_vegetable', name: '蔬菜', icon: '🥬', sort: 1, parent: 'agri', goodsCount: 0, createTime: db.serverDate() },
        { id: 'agri_fruit', name: '水果', icon: '🍎', sort: 2, parent: 'agri', goodsCount: 0, createTime: db.serverDate() },
        { id: 'agri_meat', name: '肉类', icon: '🥩', sort: 3, parent: 'agri', goodsCount: 0, createTime: db.serverDate() },
        { id: 'agri_grain', name: '粮油', icon: '🌾', sort: 4, parent: 'agri', goodsCount: 0, createTime: db.serverDate() },
        { id: 'agri_eggs', name: '蛋类', icon: '🥚', sort: 5, parent: 'agri', goodsCount: 0, createTime: db.serverDate() },
        { id: 'electronics', name: '家电数码', icon: '📺', sort: 10, parent: '', goodsCount: 0, createTime: db.serverDate() },
        { id: 'furniture', name: '家具家居', icon: '🪑', sort: 11, parent: '', goodsCount: 0, createTime: db.serverDate() },
        { id: 'clothing', name: '衣物鞋帽', icon: '👕', sort: 12, parent: '', goodsCount: 0, createTime: db.serverDate() },
        { id: 'baby', name: '母婴用品', icon: '🍼', sort: 13, parent: '', goodsCount: 0, createTime: db.serverDate() },
        { id: 'tools', name: '农具五金', icon: '🔧', sort: 14, parent: '', goodsCount: 0, createTime: db.serverDate() },
        { id: 'books', name: '图书文具', icon: '📚', sort: 15, parent: '', goodsCount: 0, createTime: db.serverDate() },
        { id: 'other', name: '其他闲置', icon: '📦', sort: 99, parent: '', goodsCount: 0, createTime: db.serverDate() }
      ];
      for (const cat of categories) {
        await db.collection('categories').add({ data: cat });
      }
      results.categories = categories.length;
    } else {
      results.categories = '已存在';
    }

    // ========== 2. 公告数据 ==========
    const noticeCount = await db.collection('notices').count();
    if (noticeCount.total === 0) {
      const notices = [
        {
          title: '👋 欢迎使用高湖村二手交易平台！',
          type: 'important',
          content: '本平台专供高湖村村民使用，请大家诚信交易、友好沟通。发布商品时请如实描述成色和价格。让我们一起建设和谐美好的高湖村！',
          images: [],
          author: '高湖村村委会',
          isTop: true,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        },
        {
          title: '🥬 时鲜农产品交易提醒',
          type: 'normal',
          content: '村里自家种的蔬菜水果上市啦！建议当面交易、现称现卖。支持按斤按两灵活计价，价格公道，新鲜直达。',
          images: [],
          author: '高湖村村委会',
          isTop: false,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        },
        {
          title: '⏰ 平台使用小贴士',
          type: 'normal',
          content: '1. 发布商品可使用语音输入，方便长辈操作\n2. 有想买的东西可以发布"求购"\n3. 社区留言板可以和大家交流\n4. 发现违规内容请及时举报',
          images: [],
          author: '平台管理员',
          isTop: false,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      ];
      for (const n of notices) {
        await db.collection('notices').add({ data: n });
      }
      results.notices = notices.length;
    } else {
      results.notices = '已存在';
    }

    // ========== 3. 商品数据（模拟村民发布的二手商品）==========
    const goodsCount = await db.collection('goods').count();
    if (goodsCount.total === 0) {
      const now = Date.now();
      const goodsList = [
        {
          title: '自种大白菜 新鲜采摘',
          description: '自家菜地种的，没打农药，绿色健康。刚从地里拔出来的，特别新鲜。要的快来拿，就在村东头。',
          categoryId: 'agri_vegetable',
          categoryName: '蔬菜',
          price: 3,
          originalPrice: 5,
          unit: '斤',
          condition: '全新',
          images: ['cloud://xxx/goods/cabbage1.jpg'],
          sellerId: 'test_user_001',
          sellerName: '张大妈',
          avatarUrl: '',
          phone: '138****1234',
          location: '高湖村村东头',
          latitude: 30.1,
          longitude: 120.2,
          status: 'selling',
          viewCount: 56,
          favoriteCount: 12,
          chatCount: 8,
          isVoice: false,
          voicePath: '',
          voiceText: '',
          tags: ['自种', '无农药', '新鲜'],
          createTime: new Date(now - 1000 * 60 * 30),  // 30分钟前
          updateTime: new Date(now - 1000 * 60 * 30)
        },
        {
          title: '闲置电饭煲 九成新',
          description: '买大了用不上，3L容量，功能正常，内胆干净。用了不到半年，搬家处理掉。价格好商量。',
          categoryId: 'electronics',
          categoryName: '家电数码',
          price: 80,
          originalPrice: 199,
          unit: '个',
          condition: '九成新',
          images: ['cloud://xxx/goods/ricecooker.jpg'],
          sellerId: 'test_user_002',
          sellerName: '李大哥',
          avatarUrl: '',
          phone: '139****5678',
          location: '高湖村3组',
          latitude: 30.101,
          longitude: 120.201,
          status: 'selling',
          viewCount: 34,
          favoriteCount: 5,
          chatCount: 3,
          isVoice: false,
          voicePath: '',
          voiceText: '',
          tags: ['家电', '九成新', '可小刀'],
          createTime: new Date(now - 1000 * 60 * 120),  // 2小时前
          updateTime: new Date(now - 1000 * 60 * 60)
        },
        {
          title: '土鸡蛋 现捡现卖',
          description: '家里散养土鸡下的蛋，蛋黄颜色深，营养丰富。每天现捡，保证新鲜。适合孕妇、小孩吃。',
          categoryId: 'agri_eggs',
          categoryName: '蛋类',
          price: 1.5,
          originalPrice: 2,
          unit: '个',
          condition: '全新',
          images: ['cloud://xxx/goods/eggs.jpg'],
          sellerId: 'test_user_003',
          sellerName: '王婶',
          avatarUrl: '',
          phone: '137****9012',
          location: '高湖村后山',
          latitude: 30.102,
          longitude: 120.199,
          status: 'selling',
          viewCount: 89,
          favoriteCount: 23,
          chatCount: 15,
          isVoice: true,
          voicePath: 'cloud://xxx/voice/eggs.mp3',
          voiceText: '土鸡蛋嘞，家里散养的鸡下的蛋，一块五一个，营养很好的，有需要的来拿啊',
          tags: ['土鸡蛋', '散养', '营养'],
          createTime: new Date(now - 1000 * 60 * 45),
          updateTime: new Date(now - 1000 * 60 * 20)
        },
        {
          title: '儿童自行车 18寸',
          description: '孩子长高了骑不了了，八成新，刹车灵敏，轮胎还好。送一个头盔和护具。适合5-9岁孩子。',
          categoryId: 'other',
          categoryName: '其他闲置',
          price: 120,
          originalPrice: 350,
          unit: '辆',
          condition: '八成新',
          images: ['cloud://xxx/goods/bike.jpg'],
          sellerId: 'test_user_004',
          sellerName: '赵姐',
          avatarUrl: '',
          phone: '136****3456',
          location: '高湖村5组',
          latitude: 30.099,
          longitude: 120.203,
          status: 'selling',
          viewCount: 67,
          favoriteCount: 9,
          chatCount: 6,
          isVoice: false,
          voicePath: '',
          voiceText: '',
          tags: ['儿童', '送配件', '可小刀'],
          createTime: new Date(now - 1000 * 60 * 200),
          updateTime: new Date(now - 1000 * 60 * 180)
        },
        {
          title: '当季草莓 甜甜甜',
          description: '大棚草莓熟透了！又大又红又甜，自己来摘更好玩，也可以我帮您摘好。送礼也有面子！',
          categoryId: 'agri_fruit',
          categoryName: '水果',
          price: 25,
          originalPrice: 35,
          unit: '斤',
          condition: '全新',
          images: ['cloud://xxx/goods/strawberry.jpg'],
          sellerId: 'test_user_005',
          sellerName: '小刘',
          avatarUrl: '',
          phone: '135****7890',
          location: '高湖村南边大棚',
          latitude: 30.098,
          longitude: 120.197,
          status: 'selling',
          viewCount: 145,
          favoriteCount: 38,
          chatCount: 22,
          isVoice: true,
          voicePath: 'cloud://xxx/voice/strawberry.mp3',
          voiceText: '草莓熟了哦！特别甜，二十五块钱一斤，在大棚这边，欢迎来尝尝',
          tags: ['当季', '草莓', '可采摘'],
          createTime: new Date(now - 1000 * 60 * 15),
          updateTime: new Date(now - 1000 * 60 * 10)
        },
        {
          title: '实木餐桌 八仙桌',
          description: '老榆木八仙桌，结实耐用，传了好几代了。表面有些岁月痕迹但结构完好，做饭桌、书桌都行。',
          categoryId: 'furniture',
          categoryName: '家具家居',
          price: 350,
          originalPrice: 800,
          unit: '张',
          condition: '七成新',
          images: ['cloud://xxx/goods/table.jpg'],
          sellerId: 'test_user_006',
          sellerName: '陈伯',
          avatarUrl: '',
          phone: '133 ****2345',
          location: '高湖村2组',
          latitude: 30.103,
          longitude: 120.198,
          status: 'selling',
          viewCount: 28,
          favoriteCount: 4,
          chatCount: 2,
          isVoice: false,
          voicePath: '',
          voiceText: '',
          tags: ['实木', '老物件', '结实'],
          createTime: new Date(now - 1000 * 60 * 300),
          updateTime: new Date(now - 1000 * 60 * 300)
        },
        {
          title: '小孩春秋外套 130码',
          description: '孩子穿不下了，九成新，洗过一次。面料舒服，颜色好看。男孩女孩都能穿。',
          categoryId: 'clothing',
          categoryName: '衣物鞋帽',
          price: 25,
          originalPrice: 89,
          unit: '件',
          condition: '九成新',
          images: ['cloud://xxx/goods/coat.jpg'],
          sellerId: 'test_user_007',
          sellerName: '周阿姨',
          avatarUrl: '',
          phone: '158****6789',
          location: '高湖村4组',
          latitude: 30.1,
          longitude: 120.202,
          status: 'selling',
          viewCount: 19,
          favoriteCount: 3,
          chatCount: 1,
          isVoice: false,
          voicePath: '',
          voiceText: '',
          tags: ['童装', '九成新', '白菜价'],
          createTime: new Date(now - 1000 * 60 * 500),
          updateTime: new Date(now - 1000 * 60 * 500)
        },
        {
          title: '电动喷雾器 农药喷洒',
          description: '新买的电动喷雾器，电池续航好，压力足，打药效率高。今年地种少了用不着了。',
          categoryId: 'tools',
          categoryName: '农具五金',
          price: 150,
          originalPrice: 280,
          unit: '台',
          condition: '几乎全新',
          images: ['cloud://xxx/goods/sprayer.jpg'],
          sellerId: 'test_user_008',
          sellerName: '吴叔',
          avatarUrl: '',
          phone: '159 ****1122',
          location: '高湖村6组',
          latitude: 30.105,
          longitude: 120.204,
          status: 'selling',
          viewCount: 42,
          favoriteCount: 7,
          chatCount: 5,
          isVoice: true,
          voicePath: 'cloud://xxx/voice/sprayer.mp3',
          voiceText: '电动喷雾器，一百五，电池好的很，打药快得很',
          tags: ['农具', '电动', '几乎全新'],
          createTime: new Date(now - 1000 * 60 * 60),
          updateTime: new Date(now - 1000 * 60 * 30)
        },
        {
          title: '农家腊肉 自家烟熏',
          description: '过年熏的腊肉，还剩一些。纯粮食猪，传统工艺烟熏，肥而不腻。切片炒辣椒绝配！',
          categoryId: 'agri_meat',
          categoryName: '肉类',
          price: 35,
          originalPrice: 48,
          unit: '斤',
          condition: '全新',
          images: ['cloud://xxx/goods/bacon.jpg'],
          sellerId: 'test_user_009',
          sellerName: '郑嫂',
          avatarUrl: '',
          phone: '186 ****3344',
          location: '高湖村1组',
          latitude: 30.097,
          longitude: 120.196,
          status: 'selling',
          viewCount: 103,
          favoriteCount: 31,
          chatCount: 18,
          isVoice: false,
          voicePath: '',
          voiceText: '',
          tags: ['腊肉', '自制', '下酒菜'],
          createTime: new Date(now - 1000 * 60 * 90),
          updateTime: new Date(now - 1000 * 60 * 40)
        },
        {
          title: '小学教辅书 全套打包',
          description: '1-6年级语文数学英语练习册，人教版。孩子毕业了，书都挺新的，没有涂画。送给需要的家庭。',
          categoryId: 'books',
          categoryName: '图书文具',
          price: 50,
          originalPrice: 200,
          unit: '套',
          condition: '九成新',
          images: ['cloud://xxx/goods/books.jpg'],
          sellerId: 'test_user_010',
          sellerName: '孙老师',
          avatarUrl: '',
          phone: '177 ****5566',
          location: '高湖村村委会旁',
          latitude: 30.1,
          longitude: 120.2,
          status: 'selling',
          viewCount: 51,
          favoriteCount: 14,
          chatCount: 9,
          isVoice: false,
          voicePath: '',
          voiceText: '',
          tags: ['教辅', '全套', '公益价'],
          createTime: new Date(now - 1000 * 60 * 400),
          updateTime: new Date(now - 1000 * 60 * 400)
        },
        {
          title: '婴儿推车 可坐可躺',
          description: '好孩子牌推车，可坐可躺，三档调节。收车方便，能带上公交车。孩子大了用不上了。',
          categoryId: 'baby',
          categoryName: '母婴用品',
          price: 180,
          originalPrice: 599,
          unit: '辆',
          condition: '八成新',
          images: ['cloud://xxx/goods/stroller.jpg'],
          sellerId: 'test_user_001',
          sellerName: '张大妈',
          avatarUrl: '',
          phone: '138****1234',
          location: '高湖村村东头',
          latitude: 30.1,
          longitude: 120.2,
          status: 'selling',
          viewCount: 76,
          favoriteCount: 18,
          chatCount: 11,
          isVoice: false,
          voicePath: '',
          voiceText: '',
          tags: ['婴儿车', '名牌', '可折叠'],
          createTime: new Date(now - 1000 * 60 * 600),
          updateTime: new Date(now - 1000 * 60 * 600)
        },
        {
          title: '新鲜土猪肉 现杀',
          description: '今早刚杀的年猪，土猪品种，肉质紧实。五花肉、排骨、瘦肉都有，先到先得！',
          categoryId: 'agri_meat',
          categoryName: '肉类',
          price: 28,
          originalPrice: 35,
          unit: '斤',
          condition: '全新',
          images: ['cloud://xxx/goods/pork.jpg'],
          sellerId: 'test_user_003',
          sellerName: '王婶',
          avatarUrl: '',
          phone: '137****9012',
          location: '高湖村后山',
          latitude: 30.102,
          longitude: 120.199,
          status: 'selling',
          viewCount: 168,
          favoriteCount: 45,
          chatCount: 33,
          isVoice: true,
          voicePath: 'cloud://xxx/voice/pork.mp3',
          voiceText: '今天早上刚杀的土猪啊，二十八块一斤，肉很好吃，要的赶紧来',
          tags: ['现杀', '土猪肉', '新鲜'],
          createTime: new Date(now - 1000 * 60 * 5),
          updateTime: new Date(now - 1000 * 60 * 2)
        }
      ];

      for (const g of goodsList) {
        await db.collection('goods').add({ data: g });
      }
      results.goods = goodsList.length;
    } else {
      results.goods = '已存在';
    }

    // ========== 4. 求购数据 ==========
    const wantedCount = await db.collection('wanted').count();
    if (wantedCount.total === 0) {
      const wantedList = [
        {
          title: '求购二手电动车',
          description: '想去镇上方便，求购一辆成色好的二手电动车，电瓶要好的。预算300以内。',
          budget: 300,
          budgetUnit: '元',
          publisherId: 'test_user_011',
          publisherName: '钱大爷',
          avatarUrl: '',
          phone: '188****7788',
          status: 'open',
          responseCount: 3,
          viewCount: 45,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        },
        {
          title: '求购秧苗 水稻苗',
          description: '今年春耕需要一批水稻苗，大概两亩地的量。有育秧的乡亲请联系我。',
          budget: 0,
          budgetUnit: '面议',
          publisherId: 'test_user_008',
          publisherName: '吴叔',
          avatarUrl: '',
          phone: '159****1122',
          status: 'open',
          responseCount: 1,
          viewCount: 28,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        },
        {
          title: '求购小学生课外书',
          description: '孙子放暑假了，想找些课外阅读书。《西游记》《三国演义》之类的名著绘本都行。',
          budget: 50,
          budgetUnit: '元',
          publisherId: 'test_user_001',
          publisherName: '张大妈',
          avatarUrl: '',
          phone: '138****1234',
          status: 'open',
          responseCount: 2,
          viewCount: 33,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        },
        {
          title: '求购玉米脱粒机',
          description: '秋收快到了，租或买一台脱粒机都行。用几天就还，或者直接买了也行。',
          budget: 200,
          budgetUnit: '元',
          publisherId: 'test_user_006',
          publisherName: '陈伯',
          avatarUrl: '',
          phone: '133****2345',
          status: 'open',
          responseCount: 0,
          viewCount: 15,
          createTime: db.serverDate(),
          updateTime: db.serverDate()
        }
      ];

      for (const w of wantedList) {
        await db.collection('wanted').add({ data: w });
      }
      results.wanted = wantedList.length;
    } else {
      results.wanted = '已存在';
    }

    // ========== 5. 社区留言数据 ==========
    const postCount = await db.collection('posts').count();
    if (postCount.total === 0) {
      const postsList = [
        {
          content: '大家注意了！后天村委会门口有免费体检，65岁以上的老人都可以去，记得带身份证！',
          images: [],
          authorId: 'test_user_012',
          authorName: '村医老林',
          avatarUrl: '',
          likeCount: 23,
          commentCount: 8,
          createTime: new Date(now - 1000 * 3600 * 2),
          updateTime: new Date(now - 1000 * 3600 * 2)
        },
        {
          content: '感谢上周买我家草莓的邻居们！明天再摘一批，还是老价格，提前预订优先留货～',
          images: ['cloud://xxx/posts/berry1.jpg'],
          authorId: 'test_user_005',
          authorName: '小刘',
          avatarUrl: '',
          likeCount: 15,
          commentCount: 6,
          createTime: new Date(now - 1000 * 3600 * 5),
          updateTime: new Date(now - 1000 * 3600 * 3)
        },
        {
          content: '请问谁家有闲置的幼儿园课本？明年小的要上幼儿园了，想提前借来看看。',
          images: [],
          authorId: 'test_user_007',
          authorName: '周阿姨',
          avatarUrl: '',
          likeCount: 5,
          commentCount: 4,
          createTime: new Date(now - 1000 * 3600 * 8),
          updateTime: new Date(now - 1000 * 3600 * 1)
        },
        {
          content: '今天在村口捡到一个钥匙串，上面有个小熊挂件，是谁丢的来认领一下。',
          images: ['cloud://xxx/posts/keys.jpg'],
          authorId: 'test_user_002',
          authorName: '李大哥',
          avatarUrl: '',
          likeCount: 8,
          commentCount: 3,
          createTime: new Date(now - 1000 * 3600 * 1),
          updateTime: new Date(now - 1000 * 3600 * 1)
        },
        {
          content: '下雨天路滑，大家出行小心！特别是村西头那段上坡路，已经跟村委反映过了，尽快修。',
          images: [],
          authorId: 'test_user_009',
          authorName: '郑嫂',
          avatarUrl: '',
          likeCount: 12,
          commentCount: 5,
          createTime: new Date(now - 1000 * 3600 * 10),
          updateTime: new Date(now - 1000 * 3600 * 10)
        },
        {
          content: '有人一起拼单买化肥吗？量大优惠，大家一起凑个整车能便宜不少！',
          images: [],
          authorId: 'test_user_008',
          authorName: '吴叔',
          avatarUrl: '',
          likeCount: 9,
          commentCount: 7,
          createTime: new Date(now - 1000 * 3600 * 24),
          updateTime: new Date(now - 1000 * 3600 * 12)
        }
      ];

      for (const p of postsList) {
        await db.collection('posts').add({ data: p });
      }
      results.posts = postsList.length;

      // 给帖子加几条评论
      const allPosts = await db.collection('posts').limit(6).get();
      const sampleComments = [
        { postId: allPosts.data[0]._id, content: '好的，转告我爸妈去！', authorName: '张大妈', createTime: db.serverDate() },
        { postId: allPosts.data[0]._id, content: '林医生辛苦了！', authorName: '李大哥', createTime: db.serverDate() },
        { postId: allPosts.data[1]._id, content: '给我留3斤！', authorName: '赵姐', createTime: db.serverDate() },
        { postId: allPosts.data[2]._id, content: '我有几本，明天给你送去', authorName: '孙老师', createTime: db.serverDate() },
        { postId: allPosts.data[3]._id, content: '是我的！马上去找你拿', authorName: '小刘', createTime: db.serverDate() },
        { postId: allPosts.data[4]._id, content: '确实太滑了，昨天差点摔倒', authorName: '陈伯', createTime: db.serverDate() },
        { postId: allPosts.data[5]._id, content: '算我一个！需要多少吨？', authorName: '郑嫂', createTime: db.serverDate() },
        { postId: allPosts.data[5]._id, content: '我也参加，正想买呢', authorName: '吴叔', createTime: db.serverDate() }
      ];
      for (const c of sampleComments) {
        await db.collection('comments').add({ data: c });
      }
      results.comments = sampleComments.length;
    } else {
      results.posts = '已存在';
    }

    return {
      success: true,
      message: '✅ 测试数据插入完成！',
      data: results
    };

  } catch (error) {
    console.error('seedData 失败:', error);
    return {
      success: false,
      message: '插入失败: ' + error.message,
      error: error.toString()
    };
  }
};
